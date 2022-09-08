/* player-tools.js */

const pBoxStyle = {'position': 'absolute', 'width': '45%', 'height': '50px', 'background-color': '#fefefe', 'padding': '5px', 'border': '4px solid #888',  'z-index': '45', 'top': '2px'};

$('head').append('<script type="text/javascript" src="https://radconnext.tech/lib/fabric.js"></script>');
$('head').append('<link rel="stylesheet" href="https://radconnext.tech/lib/jquery-ui.min.css" type="text/css" />');
$('head').append('<script type="text/javascript" src="https://radconnext.tech/lib/jquery-ui.min.js"></script>');
setTimeout(()=>{
	$('head').append('<link href="https://radconnext.tech/lib/tui-image-editor.min.css" rel="stylesheet">');
	$('head').append('<link href="https://radconnext.tech/lib/tui-color-picker.css" rel="stylesheet">');
	$('head').append('<script type="text/javascript" src="https://radconnext.tech/lib/tui-code-snippet.min.js"></script>');
	$('head').append('<script type="text/javascript" src="https://radconnext.tech/lib/tui-color-picker.js"></script>');
	$('head').append('<script type="text/javascript" src="https://radconnext.tech/lib/tui-image-editor.min.js"></script>');
	$('head').append('<script type="text/javascript" src="https://radconnext.tech/lib/simpleUpload.min.js"></script>');
	$('head').append('<script type="text/javascript" src="https://radconnext.tech/setting/plugin/jqury-readystate-plugin.js"></script>');

	$('head').append('<link rel="stylesheet" href="https://radconnext.tech/stylesheets/style.css" type="text/css" />');
	$('head').append('<link rel="stylesheet" href="https://radconnext.tech/case/css/scanpart.css" type="text/css" />');
	$('head').append('<script type="text/javascript" src="/shop/lib/player.js?ty=6451k10"></script>');
	//$('head').append('<script type="text/javascript" src="https://radconnext.tech/shop/lib/player.js?ty=6451k10"></script>');
	//$('head').append('<script type="text/javascript" src="/shop/lib/imageeditor.js?tt=mo9i456f"></script>');
	$('head').append('<script type="text/javascript" src="https://radconnext.tech/shop/lib/imageeditor.js?tt=mo9i456f"></script>');
	setTimeout(()=>{
		let myPBox = $('<div id="PBox" tabindex="1"></div>');
		$(myPBox).css(pBoxStyle);
		myPlayerHandle = $(myPBox).player({timeDelay: 7, ggFontColor: 'red', imgSize: 330, iconRootPath: 'https://radconnext.tech/', backgroundColor: 'grey'});

		$(myPBox).draggable({containment: "parent"});
		$(myPBox).resizable({containment: 'parent',
			stop: function(evt) {
				evt.stopPropagation();
				//$(myPBox).css({'width': evt.target.clientWidth, 'height': evt.target.clientHeight});
				$(this).css({'width': evt.target.clientWidth, 'height': evt.target.clientHeight});
			}
		});
		$(myPBox).on('click', (evt)=>{
			evt.stopPropagation();
			//$(myPBox).focus();
			$(this).focus();
		});
		$('body').append($(myPBox));
		$(myPBox).focus();
		$('body').css({'width': '100%', 'heigth': '100%'});
	}, 500);
}, 500);

/*
$('head').append('<script type="text/javascript" src="https://radconnext.tech/lib/fabric.js"></script>');
$('head').append('<link rel="stylesheet" href="https://radconnext.tech/lib/jquery-ui.min.css" type="text/css" />');
$('head').append('<script type="text/javascript" src="https://radconnext.tech/lib/jquery-ui.min.js"></script>');
setTimeout(()=>{
	$('head').append('<link href="https://radconnext.tech/lib/tui-image-editor.min.css" rel="stylesheet">');
	$('head').append('<link href="https://radconnext.tech/lib/tui-color-picker.css" rel="stylesheet">');
	$('head').append('<script type="text/javascript" src="https://radconnext.tech/lib/tui-code-snippet.min.js"></script>');
	$('head').append('<script type="text/javascript" src="https://radconnext.tech/lib/tui-color-picker.js"></script>');
	$('head').append('<script type="text/javascript" src="https://radconnext.tech/lib/tui-image-editor.min.js"></script>');
	$('head').append('<script type="text/javascript" src="https://radconnext.tech/lib/simpleUpload.min.js"></script>');
	$('head').append('<script type="text/javascript" src="https://radconnext.tech/setting/plugin/jqury-readystate-plugin.js"></script>');

	$('head').append('<link rel="stylesheet" href="https://radconnext.tech/stylesheets/style.css" type="text/css" />');
	$('head').append('<link rel="stylesheet" href="https://radconnext.tech/case/css/scanpart.css" type="text/css" />');
	//$('head').append('<script type="text/javascript" src="/shop/lib/player.js?ty=6451k10"></script>');
	$('head').append('<script type="text/javascript" src="https://radconnext.tech/shop/lib/player.js?ty=6451k10"></script>');
	//$('head').append('<script type="text/javascript" src="/shop/lib/imageeditor.js?tt=mo9i456f"></script>');
	$('head').append('<script type="text/javascript" src="https://radconnext.tech/shop/lib/imageeditor.js?tt=mo9i456f"></script>');
	setTimeout(()=>{
		let myPBox2 = $('<div id="PBox" tabindex="1"></div>');
		$(myPBox2).css(pBoxStyle);
		myPlayerHandle2 = $(myPBox2).player({timeDelay: 7, ggFontColor: 'red', imgSize: 330, iconRootPath: 'https://radconnext.tech/', backgroundColor: 'grey'});

		$(myPBox2).draggable({containment: "parent"});
		$(myPBox2).resizable({containment: 'parent',
			stop: function(evt) {
				$(this).css({'width': evt.target.clientWidth, 'height': evt.target.clientHeight});
			}
		});
		$(myPBox2).on('click', (evt)=>{
			$(this).focus();
		});
		$('body').append($(myPBox2));
		$(myPBox2).focus();
		$('body').css({'width': '100%', 'heigth': '100%'});
	}, 500);
}, 500);

*/

/*
https://radconnext.tech/shop/share/?id=fce4d4f4-35cb
*/

/*
(function() {
	var po = document.createElement('script');
	po.type = 'text/javascript';
	po.async = true;
	po.src = /shop/lib/jquery.js';
	var s = document.getElementsByTagName('script')[0];
	s.parentNode.insertBefore(po, s);
})();
*/
