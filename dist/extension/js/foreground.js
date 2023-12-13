(() => {

	const extensionId = 'jkmhmgghdjjbafmkgjmplhemjjnkligf';
	const body = document.querySelector('body');
	const iframe = document.createElement('iframe');

	if (body && !document.getElementById(iframe.id)) {
		body.appendChild(iframe);
	};

	iframe.id = [ 'anytypeWebclipper', 'iframe', extensionId ].join('-');
	iframe.src = chrome.runtime.getURL('iframe/index.html');

	chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
		console.log('[Foreground]', msg, sender);

		if (sender.id != extensionId) {
			return;
		};

		switch (msg.type) {
			case 'clickMenu':
				iframe.style.display = 'block';
				break;

			case 'hide':
				iframe.style.display = 'none';
				break;
		};

		sendResponse({});
		return true;
	});

	window.addEventListener('message', (e) => {
		if (e.origin != `chrome-extension://${extensionId}`) {
			return;
		};

		const { data } = e;

		console.log('postMessage', data);

		switch (data.type) {
			case 'clickClose':
				iframe.style.display = 'none';
				break;
		};
	});

})();