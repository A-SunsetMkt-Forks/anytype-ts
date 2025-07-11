import * as React from 'react';
import * as ReactDOM from 'react-dom';
import $ from 'jquery';
import raf from 'raf';
import DOMPurify from 'dompurify';
import Prism from 'prismjs';
import { instance as viz } from '@viz-js/viz';
import { observer } from 'mobx-react';
import { Icon, Label, Editable, Dimmer, Select, Error, MediaMermaid } from 'Component';
import { I, C, S, U, J, keyboard, focus, Action, translate } from 'Lib';

const katex = require('katex');
const pako = require('pako');

require('katex/dist/contrib/mhchem');

interface State {
	isShowing: boolean;
	isEditing: boolean;
	width: number;
};

const BlockEmbed = observer(class BlockEmbed extends React.Component<I.BlockComponent, State> {
	
	_isMounted = false;
	text = '';
	timeoutChange = 0;
	timeoutScroll = 0;
	node = null;
	refEditable = null;
	refType = null;
	range: I.TextRange = null;
	state = {
		isShowing: false,
		isEditing: false,
		width: 0,
	};

	constructor (props: I.BlockComponent) {
		super(props);

		this.onSelect = this.onSelect.bind(this);
		this.onKeyDownBlock = this.onKeyDownBlock.bind(this);
		this.onKeyUpBlock = this.onKeyUpBlock.bind(this);
		this.onFocusBlock = this.onFocusBlock.bind(this);
		this.onKeyDownInput = this.onKeyDownInput.bind(this);
		this.onKeyUpInput = this.onKeyUpInput.bind(this);
		this.onBlurInput = this.onBlurInput.bind(this);
		this.onChange = this.onChange.bind(this);
		this.onPaste = this.onPaste.bind(this);
		this.onEdit = this.onEdit.bind(this);
		this.onPreview = this.onPreview.bind(this);
		this.onLatexMenu = this.onLatexMenu.bind(this);
		this.onLatexTemplate = this.onLatexTemplate.bind(this);
		this.onKrokiTypeChange = this.onKrokiTypeChange.bind(this);
	};

	render () {
		const { isOnline, theme } = S.Common;
		const { isShowing, isEditing } = this.state;
		const { readonly, block } = this.props;
		const { content, fields, hAlign } = block;
		const { processor } = content;
		const { width, type } = fields || {};
		const cn = [ 'wrap', 'focusable', 'c' + block.id ];
		const menuItem: any = U.Menu.getBlockEmbed().find(it => it.id == processor) || { name: '', icon: '' };
		const text = String(content.text || '');
		const css: any = {};

		if (width) {
			css.width = (width * 100) + '%';
		};

		if (!text) {
			cn.push('isEmpty');
		};

		if (isEditing) {
			cn.push('isEditing');
		};

		let select = null;
		let source = null;
		let resize = null;
		let empty = '';
		let placeholder = '';

		if (U.Embed.allowBlockResize(processor) && text) {
			resize = <Icon className="resize" onMouseDown={e => this.onResizeStart(e, false)} />;
		};

		if (block.isEmbedKroki()) {
			select = (
				<Select 
					id={`block-${block.id}-select`} 
					ref={ref => this.refType = ref}
					value={type} 
					options={U.Embed.getKrokiOptions()} 
					arrowClassName="light" 
					onChange={this.onKrokiTypeChange}
					showOn="mouseDown"
				/>
			);
		};

		if (block.isEmbedLatex()) {
			placeholder = translate('blockEmbedLatexPlaceholder');
			empty = !text ? translate('blockEmbedLatexEmpty') : '';
			select = (
				<div id="select" className="select" onMouseDown={this.onLatexTemplate}>
					<div className="name">{translate('blockEmbedLatexTemplate')}</div>
					<Icon className="arrow light" />
				</div>
			);
		} else {
			source = <Icon className="source" onMouseDown={this.onEdit} />;
			placeholder = U.Common.sprintf(translate('blockEmbedPlaceholder'), menuItem.name);
			empty = !text ? U.Common.sprintf(translate('blockEmbedEmpty'), menuItem.name) : '';

			if (!isShowing && text && !U.Embed.allowAutoRender(processor)) {
				cn.push('withPreview');
			};
		};

		return (
			<div 
				ref={node => this.node = node}
				tabIndex={0} 
				className={cn.join(' ')}
				onKeyDown={this.onKeyDownBlock} 
				onKeyUp={this.onKeyUpBlock} 
				onFocus={this.onFocusBlock}
			>
				{source}

				<div id="valueWrap" className="valueWrap resizable" style={css}>
					{select ? <div className="selectWrap">{select}</div> : ''}

					<div id="preview" className={[ 'preview', U.Data.blockEmbedClass(processor) ].join(' ')} onClick={this.onPreview}>
						<Label text={translate('blockEmbedOffline')} />
					</div>
					<div id="value" onMouseDown={this.onEdit} />

					{empty ? <Label text={empty} className="label empty" onMouseDown={this.onEdit} /> : ''}					
					{resize}

					<Error id="error" />
					<Dimmer />
				</div>

				<Editable 
					key={`block-${block.id}-editable`}
					ref={ref => this.refEditable = ref}
					id="input"
					readonly={readonly}
					placeholder={placeholder}
					onSelect={this.onSelect}
					onBlur={this.onBlurInput}
					onKeyUp={this.onKeyUpInput} 
					onKeyDown={this.onKeyDownInput}
					onInput={this.onChange}
					onPaste={this.onPaste}
					onMouseDown={this.onSelect}
				/>
			</div>
		);
	};

	componentDidMount () {
		this._isMounted = true;
		this.resize();
		this.init();
	};

	componentDidUpdate () {
		this.init();
	};
	
	componentWillUnmount () {
		this._isMounted = false;
		this.unbind();

		window.clearTimeout(this.timeoutChange);
		window.clearTimeout(this.timeoutScroll);
	};

	init () {
		const { block } = this.props;

		this.setText(block.content.text);
		this.setValue(this.text);
		this.setContent(this.text);
		this.onScroll();
		this.rebind();
	};

	rebind () {
		const { isOnline } = S.Common;
		const { block, isPopup } = this.props;
		const { processor } = block.content;
		const { isEditing, isShowing } = this.state;
		const win = $(window);
		const node = $(this.node);
		const preview = node.find('#preview');

		this.unbind();

		if (isEditing) {
			win.on(`mousedown.${block.id}`, (e: any) => {
				if (!this._isMounted || S.Menu.isOpenList([ 'blockLatex', 'select' ])) {
					return;
				};

				if ($(e.target).parents(`#block-${block.id}`).length > 0) {
					return;
				};

				e.stopPropagation();

				S.Menu.close('blockLatex');

				this.placeholderCheck();
				this.save(true, () => { 
					this.setEditing(false);
					S.Menu.close('previewLatex');
				});
			});
		};

		node.find('#receiver').remove();

		if (![ I.EmbedProcessor.Latex, I.EmbedProcessor.Mermaid ].includes(processor)) {
			isOnline ? preview.hide() : preview.show();
		};

		if (isOnline && (isShowing || U.Embed.allowAutoRender(processor))) {
			this.setContent(this.text);
		};

		if (!U.Embed.allowAutoRender(processor)) {
			const container = U.Common.getScrollContainer(isPopup);
			container.on(`scroll.${block.id}`, () => this.onScroll());
		};

		win.on(`resize.${block.id}`, () => this.resize());

		node.on('resizeMove', (e: any, oe: any) => this.onResizeMove(oe, true));
		node.on('edit', e => this.onEdit(e));
	};

	unbind () {
		const { block, isPopup } = this.props;
		const container = U.Common.getScrollContainer(isPopup);
		const events = [ 'mousedown', 'mouseup', 'online', 'offline', 'resize' ];

		$(window).off(events.map(it => `${it}.${block.id}`).join(' '));
		container.off(`scroll.${block.id}`);
	};

	onScroll () {
		const { block, isPopup } = this.props;
		const { processor } = block.content;

		if (U.Embed.allowAutoRender(processor)) {
			return;
		};

		window.clearTimeout(this.timeoutScroll);
		this.timeoutScroll = window.setTimeout(() => {
			if (!this._isMounted) {
				return;
			};

			const container = U.Common.getScrollContainer(isPopup);
			const node = $(this.node);
			const ch = container.height();
			const st = container.scrollTop();
			const rect = node.get(0).getBoundingClientRect() as DOMRect;
			const top = rect.top - (isPopup ? container.offset().top : 0);

			if (top <= st + ch) {
				this.setShowing(true);
			};
		}, 50);
	};

	setEditing (isEditing: boolean) {
		const { block } = this.props;

		if (this.state.isEditing == isEditing) {
			return;
		};

		this.state.isEditing = isEditing;
		this.setState({ isEditing }, () => {
			if (isEditing) {
				const length = this.text.length;

				this.setRange({ from: length, to: length });
			} else {
				$(window).off(`mouseup.${block.id} mousedown.${block.id}`);
				keyboard.disableSelection(false);
			};
		});
	};

	setShowing (isShowing: boolean) {
		if (this.state.isShowing == isShowing) {
			return;
		};

		this.state.isShowing = isShowing;
		this.setState({ isShowing });
	};

	onFocusBlock () {
		const { block } = this.props;
		const range = this.range || { from: 0, to: 0 };

		focus.set(block.id, range);
		this.setRange(range);
	};

	onKeyDownBlock (e: any) {
		const { rootId, onKeyDown } = this.props;
		const node = $(this.node);
		const isEditing = node.hasClass('isEditing');

		if (isEditing) {
			// Undo
			keyboard.shortcut('undo', e, () => {
				e.preventDefault();
				keyboard.onUndo(rootId, 'editor');
			});

			// Redo
			keyboard.shortcut('redo', e, () => {
				e.preventDefault();
				keyboard.onRedo(rootId, 'editor');
			});

			keyboard.shortcut('tab', e, () => {
				e.preventDefault();
			});
		};

		if (onKeyDown && !isEditing) {
			onKeyDown(e, '', [], { from: 0, to: 0 }, this.props);
		};
	};
	
	onKeyUpBlock (e: any) {
		const { onKeyUp } = this.props;
		const node = $(this.node);
		const isEditing = node.hasClass('isEditing');

		if (onKeyUp && !isEditing) {
			onKeyUp(e, '', [], { from: 0, to: 0 }, this.props);
		};
	};

	onKeyDownInput (e: any) {
		if (!this._isMounted) {
			return;
		};

		const { filter } = S.Common;
		const range = this.getRange();

		keyboard.shortcut('backspace', e, () => {
			if (range && (range.from == filter.from)) {
				S.Menu.close('blockLatex');
			};
		});
	};

	onKeyUpInput (e: any) {
		if (!this._isMounted) {
			return;
		};

		const { block } = this.props;
		const value = this.getValue();
		const range = this.getRange();

		if (block.isEmbedLatex()) {
			const { filter } = S.Common;
			const symbolBefore = value[range?.from - 1];
			const menuOpen = S.Menu.isOpen('blockLatex');

			if ((symbolBefore == '\\') && !keyboard.isSpecial(e)) {
				S.Common.filterSet(range.from, '');
				this.onLatexMenu(e, 'input', false);
			};

			if (menuOpen) {
				const d = range.from - filter.from;
				if (d >= 0) {
					const part = value.substring(filter.from, filter.from + d).replace(/^\\/, '');
					S.Common.filterSetText(part);
				};
			};
		};

		if (!keyboard.isArrow(e)) {
			this.setContent(value);
			this.save(false);
		};
	};

	onChange () {
		const value = this.getValue();

		this.setValue(value);
		this.setContent(value);
	};

	onPaste (e: any) {
		e.preventDefault();

		const range = this.getRange();
		if (!range) {
			return;
		};

		const { block } = this.props;
		const { fields } = block;
		const data = e.clipboardData || e.originalEvent.clipboardData;
		const text = String(data.getData('text/plain') || '');
		const to = range.to + text.length;
		const value = U.Common.stringInsert(this.getValue(), text, range.from, range.to);

		const cb = () => {
			this.setValue(value);
			this.setRange({ from: to, to });
			this.save(true);
		};

		if (block.isEmbedKroki()) {
			const type = U.Embed.getKrokiType(value);
			if (type && (type != fields.type)) {
				this.onKrokiTypeChange(type, cb);
			} else {
				cb();
			};
		} else {
			cb();
		};
	};

	onBlurInput () {
		this.save(true);
	};

	onKrokiTypeChange (type: string, callBack?: () => void) {
		const { rootId, block } = this.props;
		const { fields } = block;

		C.BlockListSetFields(rootId, [
			{ blockId: block.id, fields: { ...fields, type } },
		], callBack);
	};

	onLatexTemplate (e: any) {
		e.preventDefault();
		e.stopPropagation();

		if (!this._isMounted) {
			return;
		};

		this.range = this.getRange();

		if (this.range) {
			S.Common.filterSet(this.range.from, '');
		};
		this.onLatexMenu(e, 'select', true);
	};

	onLatexMenu (e: any, element: string, isTemplate: boolean) {
		if (!this._isMounted) {
			return;
		};

		const { rootId, block } = this.props;
		const win = $(window);

		const recalcRect = () => {
			const rect = element == 'input' ? U.Common.getSelectionRect() : null;
			return rect ? { ...rect, y: rect.y + win.scrollTop() } : null;
		};

		const menuParam = {
			recalcRect,
			element: `#block-${block.id} #${element}`,
			offsetY: 4,
			offsetX: () => {
				const rect = recalcRect();
				return rect ? 0 : J.Size.blockMenu;
			},
			commonFilter: true,
			className: (isTemplate ? 'isTemplate' : ''),
			subIds: J.Menu.latex,
			onClose: () => S.Common.filterSet(0, ''),
			data: {
				isTemplate: isTemplate,
				rootId: rootId,
				blockId: block.id,
				onSelect: (from: number, to: number, item: any) => {
					let text = item.symbol || item.comment;

					if (isTemplate) {
						text = ' ' + text;
					};

					const value = U.Common.stringInsert(this.getValue(), text, from, to);

					to += text.length;

					this.setValue(value);
					this.setRange({ from: to, to });
					this.save(true);
				},
			},
		};

		raf(() => S.Menu.open('blockLatex', menuParam));
	};

	setText (text: string) {
		this.text = String(text || '');
	};

	setValue (value: string) {
		if (!this._isMounted || !this.state.isEditing) {
			return;
		};

		const { block } = this.props;
		const { processor } = block.content;
		const lang = U.Embed.getLang(processor);
		const range = this.getRange();

		if (value && lang) {
			value = Prism.highlight(value, Prism.languages[lang], lang);
		};

		this.refEditable?.setValue(value);
		this.placeholderCheck();

		if (range) {
			this.setRange(range);
		};
	};

	getValue (): string {
		return String(this.refEditable?.getTextValue() || '');
	};

	updateRect () {
		const rect = U.Common.getSelectionRect();
		if (!rect || !S.Menu.isOpen('blockLatex')) {
			return;
		};

		S.Menu.update('blockLatex', { 
			rect: { ...rect, y: rect.y + $(window).scrollTop() }
		});
	};

	setContent (text: string) {
		if (!this._isMounted) {
			return '';
		};

		const { isShowing, width } = this.state;
		const { block } = this.props;
		const { fields, content } = block;
		const { processor } = content;
		const node = $(this.node);
		const value = node.find('#value');
		const error = node.find('#error');

		error.text('').hide();

		if (!isShowing && !U.Embed.allowAutoRender(processor)) {
			value.html('');
			return;
		};

		this.setText(text);

		if (!this.text) {
			value.html('');
			return;
		};

		const win = $(window);

		switch (processor) {
			default: {
				const sandbox = [ 'allow-scripts', 'allow-same-origin', 'allow-popups' ];
				const allowIframeResize = U.Embed.allowIframeResize(processor);

				let iframe = node.find('#receiver');
				let allowScript = false;

				if (U.Embed.allowPresentation(processor)) {
					sandbox.push('allow-presentation');
				};

				const onLoad = () => {
					const iw = (iframe[0] as HTMLIFrameElement).contentWindow;
					const sanitizeParam: any = { 
						ADD_TAGS: [ 'iframe', 'div', 'a' ],
						ADD_ATTR: [
							'frameborder', 'title', 'allow', 'allowfullscreen', 'loading', 'referrerpolicy', 'src',
						],
						ALLOWED_URI_REGEXP: /^(?:(?:ftp|https?|mailto|tel|callto|sms|cid|xmpp|xxx|anytype):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
					};

					const data: any = { 
						allowIframeResize, 
						insertBeforeLoad: U.Embed.insertBeforeLoad(processor),
						useRootHeight: U.Embed.useRootHeight(processor),
						align: block.hAlign,
						processor,
						className: U.Data.blockEmbedClass(processor),
						blockId: block.id,
					};
					// Fix Bilibili schemeless urls and autoplay
					if (block.isEmbedBilibili()) {
						if (text.match(/src="\/\/player[^"]+"/)) {
							text = text.replace(/src="(\/\/player[^"]+)"/, 'src="https:$1"');
						};

						if (!/autoplay=/.test(text)) {
							text = text.replace(/(src="[^"]+)"/, `$1&autoplay=0"`);
						};
					};

					// If content is Kroki code pack the code into SVG url
					if (block.isEmbedKroki() && !text.match(/^https:\/\/kroki.io/)) {
						const compressed = pako.deflate(new TextEncoder().encode(text), { level: 9 });
						const result = btoa(U.Common.uint8ToString(compressed)).replace(/\+/g, '-').replace(/\//g, '_');
						const type = fields.type || U.Embed.getKrokiOptions()[0].id;

						text = `https://kroki.io/${type}/svg/${result}`;
						this.refType?.setValue(type);
					};

					if (U.Embed.allowEmbedUrl(processor) && !text.match(/<(iframe|script)/)) {
						text = U.Embed.getHtml(processor, U.Embed.getParsedUrl(text));
					};

					if (block.isEmbedSketchfab() && text.match(/<(iframe|script)/)) {
						text = text.match(/<iframe.*?<\/iframe>/)?.[0] || '';
					};

					if (block.isEmbedGithubGist()) {
						allowScript = !!text.match(/(?:src=")?(https:\/\/gist.github.com(?:[^"]+))"?/);
					};

					if (block.isEmbedTelegram()) {
						const m = text.match(/post="([^"]+)"/);
						allowScript = !!(m && m.length && text.match(/src="https:\/\/telegram.org([^"]+)"/));
					};

					if (block.isEmbedDrawio()) {
						sanitizeParam.ADD_TAGS.push('svg', 'foreignObject', 'switch', 'g', 'text');

						allowScript = !!text.match(/https:\/\/(?:viewer|embed|app)\.diagrams\.net\/\?[^"\s>]*/);
					};

					if (allowScript) {
						sanitizeParam.FORCE_BODY = true;
						sanitizeParam.ADD_TAGS.push('script');
					};

					if (U.Embed.allowJs(processor)) {
						data.js = text;
					} else {
						text = text.replace(/\r?\n/g, '');
						text = text.replace(/<iframe([^>]*)>.*?<\/iframe>/gi, '<iframe$1></iframe>');

						data.html = DOMPurify.sanitize(text, sanitizeParam);
					};

					iw.postMessage(data, '*');

					win.off(`message.${block.id}`).on(`message.${block.id}`, e => {
						const oe = e.originalEvent as any;
						const { type, height, blockId, url } = oe.data;
						if (blockId != block.id) {
							return;
						};

						switch (type) {
							case 'resize': {
								if (allowIframeResize) {
									iframe.css({ height: Math.max(80, height) });
								};
								break;
							};

							case 'openUrl': {
								Action.openUrl(url);
								break;
							};
						};
					});
				};

				if (!iframe.length) {
					iframe = $('<iframe />', {
						id: 'receiver',
						src: U.Common.fixAsarPath(`./embed/iframe.html?theme=${S.Common.getThemeClass()}`),
						frameborder: 0,
						scrolling: 'no',
						sandbox: sandbox.join(' '),
						allowtransparency: true,
					});

					iframe.off('load').on('load', onLoad);
					value.html('').append(iframe);
				} else {
					onLoad();
				};
				break;
			};

			case I.EmbedProcessor.Latex: {
				let html = '';

				try {
					html = katex.renderToString(text, { 
						displayMode: true, 
						strict: false,
						throwOnError: true,
						output: 'html',
						fleqn: true,
						trust: (context: any) => [ '\\url', '\\href', '\\includegraphics' ].includes(context.command),
					});
				} catch (e) {
					if (e instanceof katex.ParseError) {
						html = `<div class="error">Error in LaTeX '${U.Common.htmlSpecialChars(text)}': ${U.Common.htmlSpecialChars(e.message)}</div>`;
					} else {
						console.error(e);
					};
				};

				value.html(html);

				value.find('a').each((i: number, item: any) => {
					item = $(item);

					item.off('click').click((e: any) => {
						e.preventDefault();
						Action.openUrl(item.attr('href'));
					});
				});

				this.updateRect();
				break;
			};

			case I.EmbedProcessor.Mermaid: {
				ReactDOM.render(<MediaMermaid id={`block-${block.id}-mermaid`} chart={this.text} />, value.get(0));
				break;
			};

			case I.EmbedProcessor.Excalidraw: {
				break;
			};

			case I.EmbedProcessor.Graphviz: {
				viz().then(res => {
					try {
						value.html(res.renderSVGElement(text));
					} catch (e) {
						console.error(e);
						error.text(e.toString()).show();
					};
				});
				break;
			};
		};
	};

	placeholderCheck () {
		this.refEditable?.placeholderCheck();
	};

	onEdit (e: any) {
		const { readonly } = this.props;
		if (readonly) {
			return;
		};

		e.preventDefault();
		e.stopPropagation();

		this.setEditing(true);
	};

	onPreview (e: any) {
		this.setShowing(true);
	};

	save (update: boolean, callBack?: (message: any) => void) {
		const { rootId, block, readonly } = this.props;
		
		if (readonly) {
			return;
		};

		const value = this.getValue();

		if (update) {
			S.Block.updateContent(rootId, block.id, { text: value });
		};
		C.BlockLatexSetText(rootId, block.id, value, callBack);
	};

	getRange (): I.TextRange {
		return U.Common.objectCopy(this.refEditable.getRange());
	};

	setRange (range: I.TextRange) {
		this.range = range;
		this.refEditable.setRange(range);
	};

	onSelect () {
		if (!this._isMounted) {
			return;
		};

		const { block } = this.props;
		const win = $(window);

		keyboard.disableSelection(true);
		this.range = this.getRange();

		win.off(`mouseup.${block.id}`).on(`mouseup.${block.id}`, () => {	
			keyboard.disableSelection(false);
			win.off(`mouseup.${block.id}`);
		});
	};

	onResizeStart (e: any, checkMax: boolean) {
		e.preventDefault();
		e.stopPropagation();
		
		if (!this._isMounted) {
			return;
		};
		
		const { block } = this.props;
		const selection = S.Common.getRef('selectionProvider');
		const win = $(window);

		focus.set(block.id, { from: 0, to: 0 });
		win.off(`mousemove.${block.id} mouseup.${block.id}`);
		
		selection?.hide();

		keyboard.setResize(true);
		keyboard.disableSelection(true);

		$(`.block.blockEmbed`).addClass('isResizing');
		win.on(`mousemove.${block.id}`, e => this.onResizeMove(e, checkMax));
		win.on(`mouseup.${block.id}`, e => this.onResizeEnd(e, checkMax));
	};
	
	onResizeMove (e: any, checkMax: boolean) {
		e.preventDefault();
		e.stopPropagation();
		
		if (!this._isMounted) {
			return;
		};
		
		const node = $(this.node);
		const wrap = node.find('#valueWrap');
		
		if (!wrap.length) {
			return;
		};

		const rect = (wrap.get(0) as Element).getBoundingClientRect() as DOMRect;
		const w = this.getWidth(checkMax, e.pageX - rect.x + 20);
		
		wrap.css({ width: (w * 100) + '%' });
	};

	onResizeEnd (e: any, checkMax: boolean) {
		if (!this._isMounted) {
			return;
		};
		
		const { rootId, block } = this.props;
		const { id, fields } = block;
		const node = $(this.node);
		const wrap = node.find('#valueWrap');
		
		if (!wrap.length) {
			return;
		};

		const iframe = node.find('#receiver');

		iframe.css({ height: 'auto' });

		const win = $(window);
		const rect = (wrap.get(0) as Element).getBoundingClientRect() as DOMRect;
		const w = this.getWidth(checkMax, e.pageX - rect.x + 20);
		
		keyboard.setResize(false);
		keyboard.disableSelection(false);

		win.off(`mousemove.${block.id} mouseup.${block.id}`);
		$(`.block.blockEmbed`).removeClass('isResizing');

		C.BlockListSetFields(rootId, [
			{ blockId: id, fields: { ...fields, width: w } },
		]);
	};

	getWidth (checkMax: boolean, v: number): number {
		const { block } = this.props;
		const { id, fields } = block;
		const width = Number(fields.width) || 1;
		const el = $(`#selectionTarget-${id}`);

		if (!el.length) {
			return width;
		};
		
		const rect = el.get(0).getBoundingClientRect() as DOMRect;
		const w = Math.min(rect.width, Math.max(160, checkMax ? width * rect.width : v));
		
		return Math.min(1, Math.max(0, w / rect.width));
	};

	resize () {
		const { block } = this.props;
		const { processor } = block.content;

		if (processor == I.EmbedProcessor.Excalidraw) {
			const node = $(this.node);
			const value = node.find('#value');

			this.setState({ width: value.width() });
		};

		this.onScroll();
	};

});

export default BlockEmbed;