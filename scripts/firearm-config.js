// This is where we define and register the firearm properties
(() => {
	const FIREARM_PROPERTIES = {
		loud: {
			label: "Loud",
			for: ["ranged"],
			cost: 0,
			journalUuid: "Compendium.firearms-dc20.firearm-properties.JournalEntry.WtJZHUQK5Lqe2OFO.JournalEntryPage.mAcVFce6zbhRTnhT"
		},
		mechanicalChamber: {
			label: "Mechanical Chamber",
			for: ["ranged"],
			cost: 1,
			journalUuid: "Compendium.firearms-dc20.firearm-properties.JournalEntry.WtJZHUQK5Lqe2OFO.JournalEntryPage.MBhEyiHyQ0bvdmqf"
		},
		untestedTechnology: {
			label: "Untested Technology",
			for: ["ranged"],
			cost: -1,
			journalUuid: "Compendium.firearms-dc20.firearm-properties.JournalEntry.WtJZHUQK5Lqe2OFO.JournalEntryPage.BUIBG8fbWMpKijpP"
		},
		scatterShot: {
			label: "Scatter-shot",
			for: ["ranged"],
			cost: 2,
			journalUuid: "Compendium.firearms-dc20.firearm-properties.JournalEntry.WtJZHUQK5Lqe2OFO.JournalEntryPage.oUiUr8lUymzGgi1Q"
		},
		doubleBarrel: {
			label: "Double Barrel",
			for: ["ranged"],
			cost: 1,
			journalUuid: "Compendium.firearms-dc20.firearm-properties.JournalEntry.WtJZHUQK5Lqe2OFO.JournalEntryPage.kBSYQoNLrZyRZsfb"
		},
		fragileTechnology: {
			label: "Fragile Technology",
			for: ["ranged"],
			cost: -1,
			journalUuid: "Compendium.firearms-dc20.firearm-properties.JournalEntry.WtJZHUQK5Lqe2OFO.JournalEntryPage.jesL4DiIio5jYxHY"
		},
		cumbersome: {
			label: "Cumbersome",
			for: ["ranged"],
			cost: -1,
			journalUuid: "Compendium.firearms-dc20.firearm-properties.JournalEntry.WtJZHUQK5Lqe2OFO.JournalEntryPage.mIOtWCXvmtTkllZE"
		}
	};

	function registerProperties(target) {
		for (const [key, val] of Object.entries(FIREARM_PROPERTIES)) {
			if (!(key in target)) target[key] = val;
		}
	}

	// Inject into CONFIG at init. Specicial thanks to Sirniloc for the script in CustomStyleBuilder.js
	Hooks.once("init", () => {
		if (game.system?.id !== "dc20rpg") return;
		CONFIG.DC20RPG ??= {};
		CONFIG.DC20RPG.PROPERTIES ??= {};
		registerProperties(CONFIG.DC20RPG.PROPERTIES);
		console.info("firearms-dc20 | Registered firearm properties into CONFIG.DC20RPG.PROPERTIES");
	});

	// Mirror to DC20RPG constants at ready (if present)
	Hooks.once("ready", () => {
		if (game.system?.id !== "dc20rpg") return;
		if (globalThis.DC20RPG) {
			DC20RPG.PROPERTIES ??= {};
			registerProperties(DC20RPG.PROPERTIES);
			console.info("firearms-dc20 | Mirrored firearm properties into DC20RPG.PROPERTIES");
		}
	});

	// Scatter-shot behavior helpers
	function isRangedWeapon(item) {
		return item?.type === "weapon" && item.system?.weaponType === "ranged";
	}

	async function applyScatterShot(item) {
		const updates = {
			"system.actionType": "attack",
			"system.attackFormula.targetDefence": "area",
			// Area becomes a 3-space cone
			"system.target.areas.default.area": "cone",
			"system.target.areas.default.distance": 3,
			"system.target.areas.default.width": null,
			"system.target.areas.default.unit": "",
			"system.target.areas.default.difficult": "",
			// Ensure close range
			"system.range.melee": 1,
			"system.range.normal": 1,
			"system.range.max": null
		};
		return item.update(updates, { firearmsDc20: true });
	}

	async function revertScatterShot(item) {
		const updates = {
			"system.attackFormula.targetDefence": "precision",
			// Clear area
			"system.target.areas.default.area": "",
			"system.target.areas.default.distance": null,
			"system.target.areas.default.width": null,
			"system.target.areas.default.unit": "",
			"system.target.areas.default.difficult": "",
			// Reset to default ranged values (per item-creator)
			"system.range.melee": 1,
			"system.range.normal": 15,
			"system.range.max": 45
		};
		return item.update(updates, { firearmsDc20: true });
	}

	// Cumbersome behavior: add/remove a transfer effect that reduces ground speed by 1
	function hasCumbersome(item) {
		return !!item?.system?.properties?.cumbersome?.active;
	}

	function getCumbersomeEffects(item) {
		return item?.effects?.filter(e => e.getFlag?.("firearms-dc20", "cumbersome") === true) ?? [];
	}

	async function ensureCumbersomeEffect(item) {
		// Avoid duplicates
		if (getCumbersomeEffects(item).length) return;

		const data = {
			name: "Speed Decrease",
			img: "icons/magic/movement/chevrons-down-yellow.webp",
			origin: item.uuid,
			disabled: false,
			transfer: true,
			flags: { "firearms-dc20": { cumbersome: true } },
			type: "base",
			system: {
				statusId: "",
				duration: { useCounter: false, resetWhenEnabled: false, onTimeEnd: "" },
				effectKey: "",
				macro: "",
				addToChat: false,
				nonessential: false,
				disableWhen: { path: "", mode: "", value: "" },
				requireEnhancement: ""
			},
			changes: [
				{
					key: "system.movement.ground.bonus",
					mode: 2,
					value: "-1",
					priority: null,
					useCustom: false
				}
			],
			description: "<p>Your Ground Speed is Reduced by 1.</p>",
			duration: {
				startTime: 0,
				combat: null,
				seconds: null,
				rounds: null,
				turns: null,
				startRound: null,
				startTurn: null
			},
			statuses: [],
			sort: 0,
			tint: "#ffffff"
		};
		await item.createEmbeddedDocuments("ActiveEffect", [data], { firearmsDc20: true });
	}

	async function removeCumbersomeEffect(item) {
		const toRemove = getCumbersomeEffects(item).map(e => e.id);
		if (toRemove.length) {
			await item.deleteEmbeddedDocuments("ActiveEffect", toRemove, { firearmsDc20: true });
		}
	}

	// Apply on create if active
	Hooks.on("createItem", (item, data, options, userId) => {
		if (game.system?.id !== "dc20rpg") return;
		if (options?.firearmsDc20) return;
		if (!isRangedWeapon(item)) return;

		// Scatter-shot apply
		const scatterActive = item.system?.properties?.scatterShot?.active;
		if (scatterActive) applyScatterShot(item);

		// Cumbersome apply
		if (hasCumbersome(item)) ensureCumbersomeEffect(item);
	});

	// React to toggle on update
	Hooks.on("updateItem", (item, changes, options, userId) => {
		if (game.system?.id !== "dc20rpg") return;
		if (options?.firearmsDc20) return;
		if (!isRangedWeapon(item)) return;

		// Scatter-shot toggle
		const scatterChanged = foundry?.utils?.getProperty?.(changes, "system.properties.scatterShot.active");
		if (scatterChanged === true) applyScatterShot(item);
		else if (scatterChanged === false) revertScatterShot(item);

		// Cumbersome toggle
		const cumbersomeChanged = foundry?.utils?.getProperty?.(changes, "system.properties.cumbersome.active");
		if (cumbersomeChanged === true) ensureCumbersomeEffect(item);
		else if (cumbersomeChanged === false) removeCumbersomeEffect(item);
	});
})();
