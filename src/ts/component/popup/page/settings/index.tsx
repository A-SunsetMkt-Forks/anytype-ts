import * as React from 'react';
import { Icon, Title, Label, IconObject } from 'Component';
import { I, translate } from 'Lib';
import { authStore, blockStore, detailStore, commonStore } from 'Store';
import { observer } from 'mobx-react';
import Constant from 'json/constant.json';

interface Props extends I.Popup {
	prevPage: string;
	onPage: (id: string) => void;
};

const PopupSettingsPageIndex = observer(class PopupSettingsPageIndex extends React.Component<Props> {

	render () {
		const { onPage } = this.props;
		const { account } = authStore;
		const { config } = commonStore;
		const profile = detailStore.get(Constant.subId.profile, blockStore.profile);
		
		let rows = [
			{ id: 'personal', title: 'popupSettingsPersonalTitle', icon: 'personal' },
			{ id: 'appearance', title: 'popupSettingsAppearanceTitle', icon: 'appearance' },
			{ id: 'importIndex', title: 'popupSettingsImportTitle', icon: 'import' },
			{ id: 'exportIndex', title: 'popupSettingsExportTitle', icon: 'export' }
		];

		if (account) {
			const accountRows = [ { id: 'account', title: 'popupSettingsAccountTitle', icon: '' } ];
			
			if (config.experimental) {
				accountRows.push({ id: 'spaceIndex', title: 'popupSettingsSpaceTitle', icon: '' });
			};

			rows = accountRows.concat(rows);
		};

		const Row = (row: any) => {
			let icon = null;
			if (row.id == 'account') {
				icon = <IconObject object={profile} size={32} />;
			} else 
			if (row.icon) {
				icon = <Icon className={row.icon} />;
			};

			return (
				<div className="row" onClick={() => { onPage(row.id); }}>
					{icon}
					<Label text={translate(row.title)} />
					<Icon className="arrow" />
				</div>
			);
		};

		return (
			<div>
				<Title text={translate('popupSettingsTitle')} />

				<div className="rows">
					{rows.map((item: any, i: number) => (
						<Row key={i} {...item} />
					))}
				</div>
			</div>
		);
	};

});

export default PopupSettingsPageIndex;