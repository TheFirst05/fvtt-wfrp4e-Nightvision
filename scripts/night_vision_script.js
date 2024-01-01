const LightSource_initialize = LightSource.prototype.initialize;
LightSource.prototype.initialize = function (data = {}) {
	const { dim, bright } = this.getRadius(data.dim, data.bright); //find data.dim and data.bright

	// Avoid NaN and introducing keys that shouldn't be in the data
	// Without undefined check, global illumination will cause darkvision and similar vision modes to glitch.
	// We're assuming getRadius gives sensible values otherwise.
	if (data.dim !== undefined) data.dim = dim;
	if (data.bright !== undefined) data.bright = bright;

	return LightSource_initialize.call(this, data);
};

LightSource.prototype.getRadius = function (dim, bright) {
	const result = { dim, bright };
	let multiplier = { dim: 0, bright: 0 };

	const requiresSelection = game.user.active;
	const relevantTokens = canvas.tokens.placeables.filter((o) => !!o.actor && o.actor?.testUserPermission(game.user, "OBSERVER") && (requiresSelection ? o.controlled : true));

	const nightActor = relevantTokens; //ideally we should filter relevantTokens so the script only looks at the tokens with Night Vision. Something along the lines of "relevantTokens.filter(i => i.actor.items.name.includes("Night Vision"));"

	if (requiresSelection) {
		if (nightActor.length && nightActor.length === relevantTokens.length) {
			//if all selected tokens have Night Vision, use the lowest Night Vision value
			multiplier = { dim: 999, bright: 999 };
			for (const t of nightActor) {
				const tokenVision = t.actor.items.filter(i => i.name.includes("Night Vision"));
				multiplier.dim = Math.min(multiplier.dim, tokenVision.length);
				multiplier.bright = Math.min(multiplier.bright, tokenVision.length);
			}
		}
	} else {
		//this part does not trigger but should do if/when I can filter the relevantTokens.
		for (const t of nightActor) {
			const tokenVision = t.actor.items.filter(i => i.name.includes("Night Vision"));
			multiplier.dim = Math.max(multiplier.dim, tokenVision.length);
			multiplier.bright = Math.max(multiplier.bright, tokenVision.length);
		}
	}

	const distancePix = game.scenes.viewed.dimensions.distancePixels; //finds the pixels per unit of measurement (assuming it's yards)

	result.dim += multiplier.dim * 20 * distancePix;
	// result.bright += multiplier.bright * 20 * distancePix; //currently disabled increasing bright lights.
	return result;

};


Hooks.on("controlToken", () => {
	// Refresh lighting to (un)apply Night Vision parameters to them

	canvas.perception.update(
		{
			initializeLighting: true,
		},
		true
	);
});

