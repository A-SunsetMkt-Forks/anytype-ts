import React, { forwardRef, useState, useEffect, useRef } from 'react';
import { Filter, Icon, Select, Label } from 'Component';
import { I, U, J, translate, keyboard, Key, Storage } from 'Lib';

const PopupShortcut = forwardRef<{}, I.Popup>((props, ref) => {

	const { getId, close } = props;
	const [ page, setPage ] = useState('');
	const [ filter, setFilter ] = useState('');
	const [ editingId, setEditingId ] = useState('');
	const [ editingKeys, setEditingKeys ] = useState([]);
	const sections = J.Shortcut.getSections();
	const current = page || sections[0].id;
	const section = U.Common.objectCopy(sections.find(it => it.id == current));
	const timeout = useRef(0);
	const id = getId();

	const onClick = (item: any) => {
		setEditingId(item.id);
	};

	const Section = (item: any) => {
		const cn = [ 'section' ];

		return (
			<div className={cn.join(' ')}>
				{item.name ? <div className="name">{item.name}</div> : ''}
				{item.description ? <div className="descr">{item.description}</div> : ''}

				<div className="items">
					{item.children.map((item: any, i: number) => (
						<Item key={i} {...item} />
					))}
				</div>
			</div>
		);
	};

	const Symbol = (item: any) => {
		if (item.text == '[,]') {
			return <>,</>;
		} else {
			return <Label text={item.text} />;
		};
	};

	const Item = (item: any) => {
		const cn = [ 'item' ];

		let symbols = item.symbols || [];

		if (item.id) {
			cn.push('canEdit');

			if (editingId == item.id) {
				cn.push('isEditing');
				symbols = keyboard.getSymbolsFromKeys(editingKeys);
			};
		};

		return (
			<div className={cn.join(' ')} onClick={() => onClick(item)}>
				<div className="name">{item.name}</div>
				{symbols.length ? (
					<div className="symbols">
						{symbols.map((item: any, i: number) => <Symbol key={i} text={item} />)}
					</div>
				) : ''}
				{item.text ? <Label className="text" text={item.text} /> : ''}
			</div>
		);
	};

	const onFilterChange = (value: string) => {
		setFilter(value);
	};

	useEffect(() => {

		return () => {
			window.clearTimeout(timeout.current);
			keyboard.setShortcutEditing(false);
		};

	}, []);

	useEffect(() => {
		const win = $(window);
		const shortcuts = Storage.getShortcuts();
		const setTimeout = () => {
			window.clearTimeout(timeout.current);
			timeout.current = window.setTimeout(() => {
				keyboard.initShortcuts();
				setEditingId('');
			}, 2000);
		};

		win.off('keyup.shortcut keydown.shortcut');
		keyboard.setShortcutEditing(!!editingId);

		if (editingId) {
			let pressed = [];

			win.on('keydown.shortcut', (e: any) => {
				e.preventDefault();
				e.stopPropagation();

				const metaKeys = keyboard.metaKeys(e);
				const key = keyboard.eventKey(e);
				const code = String(e.code || '').toLowerCase();
				const skip = [ Key.meta, Key.ctrl ];

				if (key == Key.escape) {
					setEditingId('');
					window.clearTimeout(timeout.current);
					return;
				};

				if (metaKeys.length) {
					pressed = pressed.concat(metaKeys);
				};

				if (!skip.includes(key)) {
					if (code.startsWith('key')) {
						pressed.push(code.replace('key', ''));
					} else 
					if (code.startsWith('digit')) {
						pressed.push(code.replace('digit', ''));
					} else {
						pressed.push(key);
					};
				};

				pressed = U.Common.arrayUnique(pressed);

				Storage.setShortcuts({ ...shortcuts, [editingId]: pressed });
				setEditingKeys(pressed);
				setTimeout();
			});
		};

	}, [ editingId ]);

	if (filter) {
		const reg = new RegExp(U.Common.regexEscape(filter), 'gi');

		section.children = section.children.filter((s: any) => {
			s.children = s.children.filter((c: any) => {
				if (c.name && c.name.match(reg)) {
					return true;
				};

				for (const symbol of c.symbols || []) {
					if (symbol.match(reg)) {
						return true;
					};
				};

				for (const key of c.keys || []) {
					if (key.match(reg)) {
						return true;
					};
				};

				return false;
			});
			return s.children.length > 0;
		});
	};

	return (
		<>
			<div className="head">
				<div className="sides">
					<div className="side left">
						<Select id={`${id}-section`} options={sections} value={page} onChange={id => setPage(id)} />
					</div>
					<div className="side right">
						<Icon className="more withBackground" />
						<Icon className="close withBackground" tooltip={translate('commonClose')} onClick={() => close()} />
					</div>
				</div>
				<div className="filterWrap">
					<Filter className="outlined" onChange={onFilterChange} />
				</div>
			</div>

			<div className="body customScrollbar">
				{(section.children || []).map((item: any, i: number) => (
					<Section key={i} {...item} />
				))}
			</div>
		</>
	);

});

export default PopupShortcut;