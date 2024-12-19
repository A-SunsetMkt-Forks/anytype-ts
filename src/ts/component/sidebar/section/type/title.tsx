import * as React from 'react';
import { observer } from 'mobx-react';
import { IconObject, Editable } from 'Component';
import { I, keyboard, translate } from 'Lib';

const SidebarSectionTypeTitle = observer(class SidebarSectionTypeTitle extends React.Component<I.SidebarSectionComponent> {
	
	refName = null;

	constructor (props: I.SidebarSectionComponent) {
		super(props);

		this.onSelect = this.onSelect.bind(this);
		this.onChange = this.onChange.bind(this);
		this.onKeyDown = this.onKeyDown.bind(this);
	};

    render () {
		const { object } = this.props;

		console.log('object', object);

        return (
			<div className="wrap">
				<IconObject 
					id={`sidebar-icon-title-${object.id}`} 
					object={object} 
					size={24} 
					canEdit={!object.isReadonly}
					onSelect={this.onSelect}
					menuParam={{
						horizontal: I.MenuDirection.Center,
						className: 'fixed',
						classNameWrap: 'fromSidebar',
					}}
				/>

				<Editable
					ref={ref => this.refName = ref}
					onBlur={this.onChange}
					onKeyDown={this.onKeyDown}
					placeholder={translate('defaultNameType')} 
				/>
			</div>
		);
    };

	componentDidMount(): void {
		this.setValue();
	};

	componentDidUpdate () {
		this.setValue();
	};

	setValue () {
		const { object } = this.props;

		let text = String(object.name || '');
		if (text == translate('defaultNamePage')) {
			text = '';
		};

		this.refName.setValue(text);
		this.refName.placeholderCheck();
	};

	onSelect (icon: string) {
		this.props.onChange({ iconEmoji: icon });
	};

	onChange () {
		this.props.onChange({ name: this.refName?.getTextValue() });
	};

	onKeyDown (e: any) {
		keyboard.shortcut('enter', e, () => {
			e.preventDefault();
			this.onChange();
		});
	};

});

export default SidebarSectionTypeTitle;
