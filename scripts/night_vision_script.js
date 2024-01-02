const LightSource_initialize = LightSource.prototype.initialize;
LightSource.prototype.initialize = function (data = {}) {
	const { dim, bright } = this.getRadius(data.dim, data.bright);

	/* 
	Avoid NaN and introducing keys that shouldn't be in the data.
	Without undefined check, global illumination will cause darkvision and similar vision modes to glitch.
	We're assuming getRadius gives sensible values otherwise.
	*/
	if (data.dim !== undefined) data.dim = dim;
	if (data.bright !== undefined) data.bright = bright;

	return LightSource_initialize.call(this, data);
};


LightSource.prototype.getRadius = function (dim, bright) {
	const result = { dim, bright };
	let multiplier = { dim: 0, bright: 0 };

	const gmSelection = game.user.isGM || game.settings.get("wfrp4e-night-vision", "onlyOnSelection");
	const controlledtoken = canvas.tokens.controlled;
	let relevantTokens; // define which tokens with which to calculate Night Vision settings.

	/* 
	If a player has a token controlled, only define Night Vision based on those tokens.
	If a player does not control a token, define Night Vision based on all their tokens.
	GMs only define Night Vision based on tokens they select.
	*/
	if (controlledtoken.length) {
		relevantTokens = canvas.tokens.placeables.filter(
			(o) =>
				!!o.actor && o.actor?.testUserPermission(game.user, "OBSERVER") && o.controlled
		);
	} else {
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

	// find the pixels per grid unit (assume it's yards)
	const distancePix = game.scenes.viewed.dimensions.distancePixels;

	result.dim += multiplier.dim * 20 * distancePix;
	// currently disabled the functionality to increase bright radius.
	// result.bright += multiplier.bright * 20 * distancePix; 
	
	return result;
};


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
});


Hooks.on("controlToken", () => {

	// Refresh lighting to (un)apply Night Vision parameters to them
	canvas.perception.update(
		{
			initializeLighting: true,
		},
		true
	);
});
