const LightSource_initialize = LightSource.prototype.initialize;
LightSource.prototype.initialize = function (data = {}) {
	const { dim, bright } = this.getRadius(data.dim, data.bright);

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
	console.log("these are the relevant tokens", relevantTokens);
	const nightActor = relevantTokens.filter(i => i.actor.items.name.includes("Night Vision"));
	console.log("this is the nightActor", nightActor);

//const nightActor = relevantTokens.filter(i => i.name.includes("Julie"));

	if (requiresSelection) {
		if (nightActor.length && nightActor.length === relevantTokens.length) {
			multiplier = { dim: 999, bright: 999 };
			for (const t of nightActor) {
				const tokenVision = t.actor.items.filter(i => i.name.includes("Night Vision"));
				// console.log("TOKEN VISION ", tokenVision);
				multiplier.dim = Math.min(multiplier.dim, tokenVision.length);
				multiplier.bright = Math.min(multiplier.bright, tokenVision.length);
			}
		}
	} else {
		for (const t of nightActor) {
			const tokenVision = t.actor.items.filter(i => i.name.includes("Night Vision"));
			// console.log("TOKEN VISION", tokenVision);
			multiplier.dim = Math.max(multiplier.dim, tokenVision.length);
			multiplier.bright = Math.max(multiplier.bright, tokenVision.length);
		}
	}

	// if nightActor is more than 1, then use the following, otherwise return result;
/*
	multiplier.dim = Math.max(multiplier.dim, nightActor.length);
	multiplier.bright = Math.max(multiplier.bright, nightActor.length);
*/
	result.dim += multiplier.dim * 20;
	result.bright += multiplier.bright * 20;
	console.log("this is the result", result)
	return result;

};


Hooks.on("controlToken", () => {

	//console.log("this is the current lightsource and getRadius", LightSource.prototype, LightSource.prototype.getRadius);


	// Refresh lighting to (un)apply low-light vision parameters to them

	canvas.perception.update(
		{
			initializeLighting: true,
		},
		true
	);
});




// Hooks.once('controlToken', (...args) => console.log(args))

// below is the function to add control on if the light source works with Night Vision or not. 
const addLowLightVisionToLightConfig = function (app, html) {
	/** @type {AmbientLightDocument} */
	const light = app.object;

	// Create checkbox HTML element
	let checkboxStr = `<div class="form-group"><label>Poo</label>`;
	checkboxStr += '<input type="checkbox" name="yo" data-dtype="Boolean"';
	//if (light.getFlag("pf1", "disableLowLight")) checkboxStr += " checked";
	checkboxStr += "/></div>";
	const checkbox = $(checkboxStr);

	// Insert new checkbox
	html.find('div.tab[data-tab="basic"]').append(checkbox);
}; // this creates the checkbox for the Ambient Light Document

Hooks.on("renderAmbientLightConfig", (app, html) => {
	addLowLightVisionToLightConfig(app, html);
});
