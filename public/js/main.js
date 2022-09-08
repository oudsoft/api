let domainNameUrl = 'https://' + window.location.hostname;
//let domainNameUrl = 'https://localhost:4443'
//console.log(domainNameUrl);
//$('head').append('<script src="' + domainNameUrl + '/lib/jquery.js"></script>');
$('head').append('<script src="' + domainNameUrl + '/lib/jquery-ui.min.js"></script>');
$('head').append('<link rel="stylesheet" href="' + domainNameUrl + '/lib/jquery-ui.min.css" type="text/css" />');
$('head').append('<link rel="stylesheet" href="' + domainNameUrl + '/stylesheets/style.css" type="text/css" />');
$('head').append('<script type="text/javascript" src="' + domainNameUrl + '/lib/fabric.js"></script>');
setTimeout(()=>{
	$('head').append('<link href="' + domainNameUrl + '/lib/tui-image-editor.min.css" rel="stylesheet">');
	$('head').append('<link href="' + domainNameUrl + '/lib/tui-color-picker.css" rel="stylesheet">');
	$('head').append('<script type="text/javascript" src="' + domainNameUrl + '/lib/tui-code-snippet.min.js"></script>');
	$('head').append('<script type="text/javascript" src="' + domainNameUrl + '/lib/tui-color-picker.js"></script>');
	$('head').append('<script type="text/javascript" src="' + domainNameUrl + '/lib/tui-image-editor.min.js"></script>');
	$('head').append('<script type="text/javascript" src="' + domainNameUrl + '/lib/simpleUpload.min.js"></script>');
	$('head').append('<script type="text/javascript" src="' + domainNameUrl + '/setting/plugin/jqury-readystate-plugin.js"></script>');

	$('head').append('<script src="' + domainNameUrl + '/lib/RecordRTC.min.js"></script>');

	$('head').append('<link rel="stylesheet" href="' + domainNameUrl + '/stylesheets/style.css" type="text/css" />');
	$('head').append('<link rel="stylesheet" href="' + domainNameUrl + '/case/css/scanpart.css" type="text/css" />');
	//$('head').append('<script src="' + domainNameUrl + '/lib/player.js?t=jyoky"></script>');
	$('head').append('<script src="' + domainNameUrl + '/lib/player.js?ty=67801k10"></script>');

	setTimeout(()=>{
		let myPBox = $('<div id="PBox" tabindex="1"></div>');
		$(myPBox).css({'position': 'absolute', 'width': '45%', 'min-height': '50px;', 'max-height': '50px', 'background-color': '#fefefe', 'padding': '5px', 'border': '4px solid #888',  'z-index': '45', 'top': '100px'});
		let myPlayerHandle = $(myPBox).player({timeDelay: 7, ggFontColor: 'red', imgSize: 330});
		$('body').append($(myPBox));

		$(myPBox).draggable({containment: "parent"});
		$(myPBox).resizable({containment: 'parent',
			stop: function(evt) {
				$(myPBox).css({'width': evt.target.clientWidth, 'height': evt.target.clientHeight});
			}
		});
		$(myPBox).on('click', (evt)=>{
			$(myPBox).focus();
		});
		$(myPBox).on('keydown', (evt)=>{
			//console.log(evt.keyCode);
			//console.log(evt.which);
			switch (evt.keyCode) {
				case 39:
					/* Arrow Right */
					myPlayerHandle.next();
				break;
				case 37:
					/* Arrow Left */
					myPlayerHandle.prev();
				break;
				case 38:
					/* Arrow Up */
					myPlayerHandle.settings.imgSize += 10;
					$(myPlayerHandle.player).find('video').css({'width': myPlayerHandle.settings.imgSize});
					$(myPlayerHandle.player).find('#ImagePreview').css({'width': myPlayerHandle.settings.imgSize});
				break;
				case 40:
					/* Arrow Down */
					myPlayerHandle.settings.imgSize -= 10;
					$(myPlayerHandle.player).find('video').css({'width': myPlayerHandle.settings.imgSize});
					$(myPlayerHandle.player).find('#ImagePreview').css({'width': myPlayerHandle.settings.imgSize});
				break;
			}
		});

		$(myPBox).focus();
	}, 1500);
}, 1500);

/*
$.getScript( "' + domainNameUrl + '/js/main.js", function( code, textStatus, jqxhr ) {
	//let execResult = eval(code);
});

*/

/*
(function() {
	var po = document.createElement('script');
	po.type = 'text/javascript';
	po.async = true;
	po.src = domainNameUrl + /lib/jquery.js';
	var s = document.getElementsByTagName('script')[0];
	s.parentNode.insertBefore(po, s);
})();
*/
