import $ from 'jquery';
import raf from 'raf';
import { I, Util, keyboard } from 'Lib';
import { commonStore } from 'Store';
import Constant from 'json/constant.json';

const BORDER = 12;

class Preview {

	timeout: any = {
		toast: 0,
		tooltip: 0,
		preview: 0,
	};

	tooltipShow (text: string, element: any, typeX: I.MenuDirection, typeY: I.MenuDirection) {
		if (!element.length || keyboard.isResizing) {
			return;
		};

		text = text.toString().replace(/\\n/, '\n');

		window.clearTimeout(this.timeout.tooltip);
		this.timeout.tooltip = window.setTimeout(() => {
			const win = $(window);
			const obj = $('#tooltip');
			const { left, top } = element.offset();
			const st = win.scrollTop(); 
			const ew = element.outerWidth();
			const eh = element.outerHeight();
			const node = $('<div class="tooltip anim"><div class="txt"></div></div>');

			node.find('.txt').html(Util.lbBr(text));
			obj.html('').append(node);
			
			let ow = node.outerWidth();
			let oh = node.outerHeight();
			let x = left;
			let y = top;

			switch (typeX) {
				default:
				case I.MenuDirection.Center:
					x += ew / 2 - ow / 2;
					break;

				case I.MenuDirection.Left:
					break;

				case I.MenuDirection.Right:
					x += ow - ew;
					break;
			};

			switch (typeY) {
				default:
				case I.MenuDirection.Top:
					y -= oh + 6 + st;
					break;
				
				case I.MenuDirection.Bottom:
					y += eh + 6 - st;
					break;
			};
			
			x = Math.max(BORDER, x);
			x = Math.min(win.width() - ow - BORDER, x);

			node.css({ left: x, top: y }).addClass('show');
		}, 250);
	};

	tooltipHide (force: boolean) {
		const obj = $('.tooltip');

		if (force) {
			obj.removeClass('anim');
		};

		obj.removeClass('show');
		window.clearTimeout(this.timeout.tooltip);
	};

	previewShow (element: any, param: any) {
		if (!element.length || keyboard.isPreviewDisabled) {
			return;
		};
		
		const obj = $('#preview');
		
		element.off('mouseleave.link').on('mouseleave.link', () => { window.clearTimeout(this.timeout.preview); });
		obj.off('mouseleave.link').on('mouseleave.link', () => { this.previewHide(false); });
		
		this.previewHide(false);
		
		window.clearTimeout(this.timeout.preview);
		this.timeout.preview = window.setTimeout(() => { commonStore.previewSet({ ...param, element }); }, 500);
	};

	previewHide (force: boolean) {
		const obj = $('#preview');

		obj.css({ opacity: 0 });

		window.clearTimeout(this.timeout.preview);
		this.timeout.preview = window.setTimeout(() => { 
			obj.hide();
			obj.removeClass('top bottom withImage'); 

			commonStore.previewClear();
		}, force ? 0 : 250);
	};

	toastShow (param: I.Toast) {
		const setTimeout = () => {
			window.clearTimeout(this.timeout.toast);
			this.timeout.toast = window.setTimeout(() => { this.toastHide(false); }, Constant.delay.toast);
		};

		commonStore.toastSet(param);

		const obj = $('#toast');

		setTimeout();
		obj.off('mouseenter mouseleave');
		obj.on('mouseenter', () => { window.clearTimeout(this.timeout.toast); });
		obj.on('mouseleave', () => { setTimeout(); });
	};

	toastHide (force: boolean) {
		const obj = $('#toast');

		obj.css({ opacity: 0 });

		window.clearTimeout(this.timeout.toast);
		this.timeout.toast = window.setTimeout(() => {
			obj.hide();
			commonStore.toastClear();
		}, force ? 0 : 250);
	};

	toastPosition () {
		const win = $(window);
		const obj = $('#toast');

		obj.show().css({ opacity: 0 });

		raf(() => {
			obj.css({ 
				left: win.width() / 2 - obj.outerWidth() / 2, 
				top: win.height() - obj.outerHeight() - BORDER * 2,
				opacity: 1,
			});
		});
	};

	showMigrationTooltip () {
		this.tooltipShow(
			'The new version is available',
			$('#button-help'),
			I.MenuDirection.Center,
			I.MenuDirection.Top
		);
	};

	hideAll () {
		this.tooltipHide(true);
		this.previewHide(true);
		this.toastHide(true);
	};

};

export default new Preview();