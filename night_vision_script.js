const LightSource_initialize = LightSource.prototype.initialize;
LightSource.prototype.initialize = function (data = {}) {
	const { dim, bright } = this.getRadius(data.dim, data.bright);
	
	if (data.dim !== undefined) data.dim = dim;
	if (data.bright !== undefined) data.bright = bright;

	return LightSource_initialize.call(this, data);
};

LightSource.prototype.getRadius = function (dim, bright) {
	const result = { dim, bright };
	let multiplier = { dim: 0, bright: 0 };

	const requiresSelection = game.user.active;
	const relevantTokens = canvas.tokens.placeables.filter((o) => !!o.actor && o.actor?.testUserPermission(game.user, "OBSERVER") && (requiresSelection ? o.controlled : true));
	
	const nightActor = relevantTokens.filter(i => i.actor.items.name.includes("Night Vision"));

	if (requiresSelection) {
		if (nightActor.length && nightActor.length === relevantTokens.length) {
			multiplier = { dim: 999, bright: 999 };
			for (const t of nightActor) {
				const tokenVision = t.actor.items.filter(i => i.name.includes("Night Vision"));
				multiplier.dim = Math.min(multiplier.dim, tokenVision.length);
				multiplier.bright = Math.min(multiplier.bright, tokenVision.length);
			}
		}
	} else {
		for (const t of nightActor) {
			const tokenVision = t.actor.items.filter(i => i.name.includes("Night Vision"));
			multiplier.dim = Math.max(multiplier.dim, tokenVision.length);
			multiplier.bright = Math.max(multiplier.bright, tokenVision.length);
		}
	}

	// Below increases dim & bright by the correct amount of multiples of Night Vision.
	result.dim += multiplier.dim * 20;
	result.bright += multiplier.bright * 20;
	return result;

};


Hooks.on("controlToken", () => {
	// Refresh lighting to (un)apply low-light vision parameters to them
	canvas.perception.update(
		{
			initializeLighting: true,
		},
		true
	);
});
