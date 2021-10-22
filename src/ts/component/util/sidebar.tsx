import * as React from 'react';
import { I, C, DataUtil } from 'ts/lib';
import { IconObject } from 'ts/component';
import { observer } from 'mobx-react';
import { blockStore } from 'ts/store';

interface Props {
};

interface State {
	loading: boolean;
};

const Constant = require('json/constant.json');

const Sidebar = observer(class Sidebar extends React.Component<Props, State> {

	state = {
		loading: false,
	};
	data: any = {
		nodes: [],
		edges: [],
	};

	render () {
		const { loading } = this.state;
        const tree = this.getTree();

        let depth = 0;

        const Item = (item: any) => {
            let name: any = item.name || DataUtil.defaultName('page');
			if (!item.name && (item.layout == I.ObjectLayout.Note)) {
				name = <div className="empty">Empty</div>;
			};

            return (
                <div className={[ 'item', 'depth' + item.depth ].join(' ')}>
                    <div className="flex">
                        <IconObject object={...item} />
                        <div className="name">{name}</div>
                    </div>

                    <div className="children">
                        {item.children.map((child: any, i: number) => (
                            <Item key={child.id + '-' + item.depth} {...child} depth={item.depth + 1} />
                        ))}
                    </div>
                </div>
            );
        };

		return (
            <div className="sidebar">
                {tree.map((item: any, i: number) => (
                    <Item key={item.id + '-' + depth} {...item} depth={depth} />
                ))}
            </div>
		);
	};

	componentDidMount () {
		this.load();
	};

	load () {
		const filters: any[] = [
			{ operator: I.FilterOperator.And, relationKey: 'isHidden', condition: I.FilterCondition.Equal, value: false },
			{ operator: I.FilterOperator.And, relationKey: 'isArchived', condition: I.FilterCondition.Equal, value: false },
			{ 
				operator: I.FilterOperator.And, relationKey: 'type', condition: I.FilterCondition.NotIn, 
				value: [ 
					Constant.typeId.relation,
					Constant.typeId.type,
					Constant.typeId.template,
					Constant.typeId.file,
					Constant.typeId.image,
					Constant.typeId.video,
					Constant.typeId.audio,
				] 
			},
			{ 
				operator: I.FilterOperator.And, relationKey: 'id', condition: I.FilterCondition.NotIn, 
				value: [
					'_anytype_profile',
					blockStore.profile,
				] 
			},
		];

		this.setState({ loading: true });

		C.ObjectGraph(filters, 0, [], (message: any) => {
			if (message.error.code) {
				return;
			};

			this.data.edges = message.edges.filter(d => { return d.source !== d.target; });
			this.data.nodes = message.nodes;

			this.setState({ loading: false });
		});
	};

    getTree () {
        const edges = this.data.edges.map((edge: any) => {
            edge.target = this.data.nodes.find((node: any) => { return node.id == edge.target; });
            return edge;
        });

        const nodes = this.data.nodes.map((node: any) => {
            node.children = edges.filter((edge: any) => {
                return edge.source == node.id;
            }).map((edge: any) => { 
                return edge.target;
            });
            return node;
        });
        return nodes;
    };

});

export default Sidebar;