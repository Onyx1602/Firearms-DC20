(() => {
	'use strict';

	// Define styles and their associated conditions
	const STYLE_CONDITIONS = {
		pistol: ["prone"],
		rifle: ["exposed"],
		shotgun: ["bleeding"],
		smg: ["disoriented"],
		sniper: ["surprised"],
		flamethrower: ["burning"],
		minigun: ["impaired", "intimidated"]
	};

	// Add journal UUIDs for each custom style
	const STYLE_JOURNALS = {
		pistol: "Compendium.firearms-dc20.firearm-properties.JournalEntry.UgYxfXRXIlPlXqDg.JournalEntryPage.mAcVFce6zbhRTnhT",
		rifle: "Compendium.firearms-dc20.firearm-properties.JournalEntry.UgYxfXRXIlPlXqDg.JournalEntryPage.qPyLPDc65Sa62Rhu",
		shotgun: "Compendium.firearms-dc20.firearm-properties.JournalEntry.UgYxfXRXIlPlXqDg.JournalEntryPage.JeIa4DAeZjSkgF0N",
		smg: "Compendium.firearms-dc20.firearm-properties.JournalEntry.UgYxfXRXIlPlXqDg.JournalEntryPage.7uN1Qfw7PCU8FGEC",
		sniper: "Compendium.firearms-dc20.firearm-properties.JournalEntry.UgYxfXRXIlPlXqDg.JournalEntryPage.Lv0NDyS6TLtAWRtj",
		flamethrower: "Compendium.firearms-dc20.firearm-properties.JournalEntry.UgYxfXRXIlPlXqDg.JournalEntryPage.WU8NdfrNXtkncXGG",
		minigun: "Compendium.firearms-dc20.firearm-properties.JournalEntry.UgYxfXRXIlPlXqDg.JournalEntryPage.z4LPOTVzHM0Ofqwc"
	};

	const toKey = (name) => String(name).toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, "");
	const toLabel = (name) => {
		const n = String(name).trim().toLowerCase();
		return (n.charAt(0).toUpperCase() + n.slice(1)) + " Style";
	};

	// Register journals helper
	function registerStyleJournals(target) {
		for (const [key, uuid] of Object.entries(STYLE_JOURNALS)) {
			if (!(key in target)) target[key] = uuid;
		}
	}

	// Inject journal UUIDs into CONFIG on init 
	Hooks.once("init", () => {
		if (game.system?.id !== "dc20rpg") return;
		CONFIG.DC20RPG ??= {};
		CONFIG.DC20RPG.SYSTEM_CONSTANTS ??= {};
		CONFIG.DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID ??= {};
		CONFIG.DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.weaponStylesJournal ??= {};
		registerStyleJournals(CONFIG.DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.weaponStylesJournal);
		console.info("firearms-dc20 | Registered firearm style journals into CONFIG.DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.weaponStylesJournal");
	});

	// Only use the CustomStyleRegistry if available
	function registerWithRegistry(style, conditions) {
		try {
			// createCustomStyle(customStyle, conditions, ranged = false)
			CustomStyleRegistry.createCustomStyle(style, conditions, true);
		} catch (e) {
			console.error(`firearms-dc20 | CustomStyleRegistry not available, cannot register "${style}" with conditions.`, e);
		}
	}

	// Accept conditions in the registration path
	function registerStyle(style, conditions) {
		const key = toKey(style);
		// Skip if already present
		if (CONFIG?.DC20RPG?.DROPDOWN_DATA?.weaponStyles?.[key]) return;

		if (typeof CustomStyleRegistry?.createCustomStyle === "function") {
			registerWithRegistry(style, conditions);
		} else {
			console.error(`firearms-dc20 | CustomStyleRegistry missing. Enable the module providing CustomStyleBuilder.js before this module.`);
		}
	}

	Hooks.once("ready", () => {
		if (!CONFIG?.DC20RPG?.DROPDOWN_DATA) {
			console.warn("firearms-dc20 | DC20RPG config not found. Styles not registered.");
			return;
		}
		if (typeof CustomStyleRegistry?.createCustomStyle !== "function") {
			console.error("firearms-dc20 | CustomStyleRegistry not found. Conditions cannot be registered.");
			return;
		}

		// Mirror journals to global DC20RPG if present
		if (globalThis.DC20RPG) {
			DC20RPG.SYSTEM_CONSTANTS ??= {};
			DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID ??= {};
			DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.weaponStylesJournal ??= {};
			registerStyleJournals(DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.weaponStylesJournal);
			console.info("firearms-dc20 | Mirrored firearm style journals into DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.weaponStylesJournal");
		}

		// Register each style with its conditions via the registry
		Object.entries(STYLE_CONDITIONS).forEach(([style, conditions]) => registerStyle(style, conditions));

		// Ensure existing actors receive the new conditionals now
		const actors = game.actors?.contents ?? [];
		for (const a of actors) {
			try {
				CustomStyleRegistry.addCustomStyleToActor(a);
			} catch (e) {
				console.warn(`firearms-dc20 | Failed to add custom style conditionals to actor "${a?.name}".`, e);
			}
		}
	});
})();
