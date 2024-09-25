Hooks.once("init", () => {
	CONFIG.AmbientLight.objectClass = mixin(CONFIG.AmbientLight.objectClass);
	CONFIG.Token.objectClass = mixin(CONFIG.Token.objectClass);
});

Hooks.on('init', () => {

	game.settings.register("wfrp4e-night-vision", "onlyOnSelection", {
		name: "Night Vision requires selection",
		hint: "With this setting on, players must select a token to see with Night Vision",
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
		onChange: () => {
			// Refresh canvas sight
			canvas.perception.update(
				{ initializeLighting: true, initializeVision: true, refreshLighting: true, refreshVision: true },
				true
			);
		},
	});

	game.settings.register("wfrp4e-night-vision", "nightVisionDistance", {
		name: "Night Vision range",
		hint: "Modifies the distance granted per rank in Night Vision. Default is 20",
		scope: "world",
		config: true,
		default: 20,
		type: Number,
		step: "any",
		onChange: () => {
			// Refresh canvas sight
			canvas.perception.update(
				{ initializeLighting: true, initializeVision: true, refreshLighting: true, refreshVision: true },
				true
			);
		},
	});

	game.settings.register("wfrp4e-night-vision", "nightVisionBright", {
		name: "Night Vision affects bright illumination",
		hint: "With this setting on, Night Vision also increases the radius of bright illumination by half the value of dim illumination",
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
		onChange: () => {
			// Refresh canvas sight
			canvas.perception.update(
				{ initializeLighting: true, initializeVision: true, refreshLighting: true, refreshVision: true },
				true
			);
		},
	});
});


//define the values that calculate the Nightvision multiplier, and make them 0 so they don't introduce undefined into the calculation
let multiplier = { dim: 0, bright: 0 };
let nightVisionDistance = 0;
let distancePix = 0;

//Thus us where the magic happens
const mixin = Base => class extends Base {
	/** @override */
	_getLightSourceData() {
		const data = super._getLightSourceData();

		data.dim += multiplier.dim * nightVisionDistance * distancePix;

		if (game.settings.get("wfrp4e-night-vision", "nightVisionBright")) {
			data.bright += multiplier.bright * nightVisionDistance / 2 * distancePix;
		}
		return data;
	}
};

const visionCalculator = function () {
	multiplier = { dim: 0, bright: 0 }; //reset multiplier to 0 (erases previous values)
	const gmSelection = game.user.isGM || game.settings.get("wfrp4e-night-vision", "onlyOnSelection");
	const controlledtoken = canvas.tokens.controlled;
	let relevantTokens; // define which tokens with which to calculate Night Vision settings.

	/* 
	If a player has a token controlled, only define Night Vision based on those tokens.
	If a player does not control a token, define Night Vision based on all their tokens.
	GMs only define Night Vision based on tokens controlled.
	*/
	if (controlledtoken.length) {//if a token controlled, collect all tokens that you are controlling that you have vision for
		relevantTokens = canvas.tokens.placeables.filter(
			(o) =>
				!!o.actor && o.actor?.testUserPermission(game.user, "OBSERVER") && o.controlled
		);
	} else { //if no tokens controlled, then check all tokens for which you have vision. this doesn't apply for GM
		relevantTokens = canvas.tokens.placeables.filter(
			(o) =>
				!!o.actor && o.actor?.testUserPermission(game.user, "OBSERVER") && (gmSelection ? o.controlled : true)
		);
	};

	if (gmSelection && relevantTokens.length) {
		// GM mode: only sees Night Vision if 100% selected tokens have Night Vision (and only the worst).
		// At least one token must be selected for Night Vision to trigger (otherwise it's default foundry behaviour).
		multiplier = { dim: 999, bright: 999 };

		for (const t of relevantTokens) {
			const tokenVision = t.actor.items.filter(i => i.name.includes(game.i18n.localize("NAME.NightVision")));
			multiplier.dim = Math.min(multiplier.dim, tokenVision.length);
			multiplier.bright = Math.min(multiplier.bright, tokenVision.length);
		}
	} else {
		// Player mode: sees best Night Vision of all owned tokens.
		for (const t of relevantTokens) {
			const tokenVision = t.actor.items.filter(i => i.name.includes(game.i18n.localize("NAME.NightVision")));
			multiplier.dim = Math.max(multiplier.dim, tokenVision.length);
			multiplier.bright = Math.max(multiplier.bright, tokenVision.length);
		}
	}

	// Define the values for nightvision distance
	distancePix = game.scenes.viewed.dimensions.distancePixels; // find the pixels per grid unit (assume it's yards)
	nightVisionDistance = game.settings.get("wfrp4e-night-vision", "nightVisionDistance");

	//console.log("LOOK HERE", multiplier, result);

	// Refresh lighting to (un)apply Night Vision parameters to them
	for (const { object } of canvas.effects.lightSources) {
		if (!((object instanceof AmbientLight) || (object instanceof Token))) continue;
		object.initializeLightSource();
	}

};

const Debouncer = foundry.utils.debounce(visionCalculator, 10);

Hooks.on("controlToken", () => {
	Debouncer();
});
