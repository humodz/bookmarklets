javascript:(() => {
	const id = '__babbel_hide_dialogue';

	const existing = document.querySelector('#' + id);

	if (existing) {
		existing.remove();
		return;
	}

	const css = `
		[data-trainer-type=dialog]
		[data-selector=styled-ds-text]:not(:hover)
		[data-selector$=interactive] > * {
		    color: transparent !important;
		}
	`;

	const style = document.createElement('style');
	style.id = id;
	style.textContent = css;
	document.body.append(style);
})();