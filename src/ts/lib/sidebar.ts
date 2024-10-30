import $ from 'jquery';
import raf from 'raf';
import { U, S, J, Storage, keyboard } from 'Lib';

interface SidebarData {
	width: number;
	isClosed: boolean;
};

class Sidebar {
	
	data: SidebarData = {
		width: 0,
		isClosed: false,
	};

	objLeft: JQuery<HTMLElement> = null;
	objRight: JQuery<HTMLElement> = null;
	dummyLeft: JQuery<HTMLElement> = null;
	dummyRight: JQuery<HTMLElement> = null

	page: JQuery<HTMLElement> = null;
	header: JQuery<HTMLElement> = null;
	footer: JQuery<HTMLElement> = null;
	loader: JQuery<HTMLElement> = null;
	toggleButton: JQuery<HTMLElement> = null;
	vault: JQuery<HTMLElement> = null;
	isAnimating = false;
	timeoutAnim = 0;

	init () {
		this.initObjects();

		const stored = Storage.get('sidebar');
		const vault = $(S.Common.getRef('vault').node);

		if (stored) {
			if ('undefined' == typeof(stored.isClosed)) {
				stored.isClosed = !stored.width;
			};

			this.set(stored);
		} else {
			this.set({
				width: J.Size.sidebar.width.default,
				isClosed: false,
			});

			this.resizePage(J.Size.sidebar.width.default, false);
		};

		if (this.data.isClosed) {
			vault.addClass('isClosed');
			this.objLeft.addClass('isClosed');
		} else {
			vault.removeClass('isClosed');
			this.objLeft.removeClass('isClosed');
		};
	};

	initObjects () {
		const vault = S.Common.getRef('vault');

		this.objLeft = $('#sidebarLeft');
		this.objRight = $('#sidebarRight');
		this.dummyLeft = $('#sidebarDummyLeft');
		this.dummyRight = $('#sidebarDummyRight');

		this.page = $('#page.isFull');
		this.header = this.page.find('#header');
		this.footer = this.page.find('#footer');
		this.loader = this.page.find('#loader');
		this.toggleButton = $('#sidebarToggle');

		if (vault) {
			this.vault = $(vault.node);
		};
	};

	close (): void {
		const { width, isClosed } = this.data;

		if (!this.objLeft || !this.objLeft.length || this.isAnimating || isClosed) {
			return;
		};

		this.objLeft.addClass('anim');
		this.setElementsWidth(width);
		this.setAnimating(true);
		this.setStyle({ width: 0 });
		this.set({ isClosed: true });
		this.resizePage(0, true);
		this.vaultHide();

		this.removeAnimation(() => {
			this.objLeft.addClass('isClosed');

			window.clearTimeout(this.timeoutAnim);
			this.timeoutAnim = window.setTimeout(() => {
				$(window).trigger('resize');
				this.setAnimating(false);
				this.vault.removeClass('anim');
			}, this.getVaultDuration(this.data.width));
		});
	};

	open (width?: number): void {
		if (!this.objLeft || !this.objLeft.length || this.isAnimating || !this.data.isClosed) {
			return;
		};

		this.setElementsWidth(width);
		this.setAnimating(true);
		this.vaultShow(width);

		window.clearTimeout(this.timeoutAnim);
		this.timeoutAnim = window.setTimeout(() => {
			this.objLeft.removeClass('isClosed');
			this.objLeft.addClass('anim');

			this.setStyle({ width });
			this.set({ isClosed: false });
			this.resizePage(width, true);

			this.removeAnimation(() => {
				$(window).trigger('resize');
				this.setAnimating(false);
				this.vault.removeClass('anim');
			});
		}, this.getVaultDuration(width));
	};

	toggleOpenClose () {
		if (this.isAnimating) {
			return;
		};
		
		const { width, isClosed } = this.data;
		
		isClosed ? this.open(width) : this.close();
	};

	setElementsWidth (width: any): void {
		this.objLeft.find('#head').css({ width });
		this.objLeft.find('#body').css({ width });
		this.objLeft.find('#shareBanner').css({ width: (width ? width - 24 : '') });
	};

	setWidth (w: number): void {
		w = this.limitWidth(w);

		this.set({ width: w, isClosed: false });
		this.resizePage(w, false);
	};

	private removeAnimation (callBack?: () => void): void {
		if (!this.objLeft || !this.objLeft.length) {
			return;
		};

		window.clearTimeout(this.timeoutAnim);
		this.timeoutAnim = window.setTimeout(() => {
			this.objLeft.removeClass('anim');
			this.setElementsWidth('');

			if (callBack) {
				callBack();
			};
		}, J.Constant.delay.sidebar);
	};

	onMouseMove (): void {
		const { showVault, hideSidebar } = S.Common;

		if (!this.objLeft || !this.objLeft.length || keyboard.isDragging) {
			return;
		};

		if (
			this.isAnimating ||
			!hideSidebar
		) {
			return;
		};

		const { x } = keyboard.mouse.page;
		const { width, isClosed } = this.data;
		const vw = isClosed || !showVault ? 0 : J.Size.vault.width;
		const menuOpen = S.Menu.isOpenList([ 'dataviewContext', 'widget', 'selectSidebarToggle' ]);
		const popupOpen = S.Popup.isOpen();

		let show = false;
		let hide = false;

		if (x <= 10) {
			show = true;
		} else
		if (x >= width + vw + 30) {
			hide = true;
		};

		if (popupOpen) {
			show = false;
		};

		if (menuOpen) {
			show = false;
			hide = false;
		};

		if (show) {
			this.open(width);
		};

		if (hide && !isClosed) {
			this.close();
		};
	};

	resizePage (widthLeft: number, animate: boolean): void {
		this.initObjects();

		let widthRight = 0;
		let toggleX = 16;

		if ((widthLeft === null) && this.objLeft && this.objLeft.length) {
			widthLeft = this.objLeft.outerWidth();
		};

		if (this.objRight && this.objRight.length) {
			widthRight = this.objRight.outerWidth();
		};

		if (!keyboard.isMain() || keyboard.isMainVoid()) {
			widthLeft = 0;
			widthRight = 0;
		};

		const { isClosed } = this.data;
		const { showVault, isFullScreen } = S.Common;
		const { ww } = U.Common.getWindowDimensions();
		const vw = isClosed || !showVault || !keyboard.isMain() ? 0 : J.Size.vault.width;

		widthLeft += vw;

		const pageWidth = ww - widthLeft - widthRight;
		const ho = keyboard.isMainHistory() ? J.Size.history.panel : 0;
		const navigation = S.Common.getRef('navigation');

		if ((widthLeft && showVault) || (U.Common.isPlatformMac() && !isFullScreen)) {
			toggleX = 84;
		};

		this.header.css({ width: '' });
		this.footer.css({ width: '' });
		this.dummyLeft.css({ width: widthLeft });

		if (animate) {
			this.header.addClass('sidebarAnimation');
			this.page.addClass('sidebarAnimation');
			this.footer.addClass('sidebarAnimation');
			this.dummyLeft.addClass('sidebarAnimation');
			this.toggleButton.addClass('sidebarAnimation');
		} else {
			this.header.removeClass('sidebarAnimation');
			this.page.removeClass('sidebarAnimation');
			this.footer.removeClass('sidebarAnimation');
			this.dummyLeft.removeClass('sidebarAnimation');
			this.toggleButton.removeClass('sidebarAnimation');
		};

		navigation?.position(widthLeft, animate);
		widthLeft ? this.header.addClass('withSidebarLeft') : this.header.removeClass('withSidebarLeft');

		this.page.css({ width: pageWidth });
		this.loader.css({ width: pageWidth, right: 0 });
		this.header.css({ width: pageWidth - ho });
		this.footer.css({ width: pageWidth - ho });
		this.toggleButton.css({ left: toggleX });

		$(window).trigger('sidebarResize');
	};

	private save (): void {
		Storage.set('sidebar', this.data);
	};

	set (v: Partial<SidebarData>): void {
		v = Object.assign(this.data, v);

		const { width } = v;

		this.data = Object.assign<SidebarData, Partial<SidebarData>>(this.data, { 
			width: this.limitWidth(width),
		});

		this.save();
		this.setStyle(this.data);
	};

	public setAnimating (v: boolean) {
		this.isAnimating = v;
	};

	private setStyle (v: Partial<SidebarData>): void {
		if (!this.objLeft || !this.objLeft.length) {
			return;
		};

		const width = v.isClosed ? 0 : v.width;

		this.objLeft.css({ width });
	};

	/**
	 * Limit the sidebar width to the max and min bounds
	 */
	private limitWidth (width: number): number {
		const { min, max } = J.Size.sidebar.width;
		return Math.max(min, Math.min(max, Number(width) || 0));
	};

	getDummyWidth (): number {
		return Number($('#sidebarDummy').outerWidth()) || 0;
	};

	vaultHide () {
		this.vault.addClass('anim');
		this.setVaultAnimationParam(this.data.width, true);
		this.vault.addClass('isClosed');
	};

	vaultShow (width: number) {
		this.vault.addClass('anim');
		this.setVaultAnimationParam(width, false);
		this.vault.removeClass('isClosed');
	};

	setVaultAnimationParam (width: number, withDelay: boolean) {
		const css: any = { transitionDuration: `${this.getVaultDuration(width)}ms`, transitionDelay: '' };

		if (withDelay) {
			css.transitionDelay = `${J.Constant.delay.sidebar}ms`;
		};

		this.vault.css(css);
	};

	getVaultDuration (width: number): number {
		return J.Size.vault.width / width * J.Constant.delay.sidebar;
	};

	objectContainerToggle () {
		const ref = S.Common.getRef('sidebarLeft');
		if (!ref) {
			return;
		};

		const page = ref.state.page;
		ref.setState({ page: (page == 'object' ? '' : 'object') });
	};

	rightPanelToggle (v: boolean) {
		S.Common.showSidebarRightSet(v);
		raf(() => this.resizePage(null, false));
	};

	rightPanelSwitch (page: string, param: any) {
		S.Common.getRef('sidebarRight').setState({ page, ...param });
	};

};

export const sidebar: Sidebar = new Sidebar();