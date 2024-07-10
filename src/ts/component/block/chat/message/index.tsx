import * as React from 'react';
import $ from 'jquery';
import { observer } from 'mobx-react';
import { IconObject, Icon, ObjectName, ObjectDescription } from 'Component';
import { I, S, U, J, Mark, translate, Preview } from 'Lib';

interface Props extends I.Block, I.BlockComponent {
	data: any;
	isThread: boolean;
	onThread: (id: string) => void;
};

const LINES_LIMIT = 10;

const ChatMessage = observer(class ChatMessage extends React.Component<Props> {

	node = null;
	text: any = null;
	canExpand: boolean = false;
	expanded: boolean = false;

	constructor (props: Props) {
		super(props);

		this.onExpand = this.onExpand.bind(this);
		this.onReactionAdd = this.onReactionAdd.bind(this);
		this.onReactionEnter = this.onReactionEnter.bind(this);
		this.onReactionLeave = this.onReactionLeave.bind(this);
	};

	render () {
		const { id, data, isThread, onThread } = this.props;
		const { space } = S.Common;
		const { account } = S.Auth;
		const length = this.getChildren().length;
		const author = U.Space.getParticipant(U.Space.getParticipantId(space, data.identity));
		const text = U.Common.lbBr(Mark.toHtml(data.text, data.marks));
		const attachments = (data.attachments || []).map(id => S.Detail.get(J.Constant.subId.file, id));
		const reactions = data.reactions || [];
		const cn = [ 'message' ];

		if (data.identity == account.id) {
			cn.push('isSelf');
		};
		if (this.canExpand) {
			cn.push('canExpand');
		};
		if (this.expanded) {
			cn.push('expanded');
		};

		const Reaction = (item: any) => {
			const authors = item.authors || [];
			const length = authors.length;
			const author = length ? U.Space.getParticipant(U.Space.getParticipantId(space, authors[0])) : '';

			return (
				<div 
					className="reaction" 
					onClick={() => this.onReactionSelect(item.value)}
					onMouseEnter={e => this.onReactionEnter(e, authors)}
					onMouseLeave={this.onReactionLeave}
				>
					<div className="value">
						<IconObject object={{ iconEmoji: item.value }} size={18} />
					</div>
					<div className="count">
						{length > 1 ? length : <IconObject object={author} size={18} />}
					</div>
				</div>
			);
		};

		const Attachment = (item: any) => {
			return (
				<div className="attachment" onClick={() => U.Object.openPopup(item)}>
					<IconObject object={item} size={48} />
					<div className="info">
						<ObjectName object={item} />
						<ObjectDescription object={item} />
					</div>
				</div>
			);
		};

		return (
			<div 
				ref={ref => this.node = ref} 
				id={`item-${id}`} 
				className={cn.join(' ')}
			>
				<div className="side left">
					<IconObject object={author} size={48} />
				</div>
				<div className="side right">
					<div className="author">
						<ObjectName object={author} />
						<div className="time">{U.Date.date('H:i', data.time)}</div>
					</div>

					<div className="textWrapper">
						<div ref={ref => this.text = ref}  className="text" dangerouslySetInnerHTML={{ __html: U.Common.sanitize(text) }}></div>

						{this.canExpand && !this.expanded ? <div className="expand" onClick={this.onExpand}>{translate('blockChatMessageExpand')}</div> : ''}
					</div>

					{attachments.length ? (
						<div className="attachments">
							{attachments.map((item: any, i: number) => (
								<Attachment key={i} {...item} />
							))}
						</div>
					) : ''}

					<div className="reactions">
						{reactions.map((item: any, i: number) => (
							<Reaction key={i} {...item} />
						))}
						<Icon className="add" onClick={this.onReactionAdd} tooltip={translate('blockChatReactionAdd')} />
					</div>

					<div className="sub" onClick={() => onThread(id)}>
						{!isThread ? <div className="item">{length} replies</div> : ''}
					</div>

				</div>
			</div>
		);
	};

	componentDidMount(): void {
		const { data, renderLinks } = this.props;

		renderLinks(this.node, data.marks, false, () => {});

		this.checkLinesLimit();
	};

	onExpand () {
		this.expanded = true;
		this.forceUpdate();
	};

	getChildren () {
		const { rootId, id } = this.props;
		const childrenIds = S.Block.getChildrenIds(rootId, id);

		return S.Block.getChildren(rootId, id, it => it.isText());
	};

	checkLinesLimit () {
		const textHeight = $(this.text).outerHeight();
		const lineHeight = Number($(this.text).css('line-height').replace('px', ''));

		if (textHeight/lineHeight > LINES_LIMIT) {
			this.canExpand = true;
			this.forceUpdate();
		};
	};

	onReactionEnter (e: any, authors: string[]) {
		const { space } = S.Common;

		const text = authors.map(it => {
			const author = U.Space.getParticipant(U.Space.getParticipantId(space, it));

			return author.name;
		}).filter(it => it).join('\n');

		Preview.tooltipShow({ text, element: $(e.currentTarget) });
	};

	onReactionLeave (e: any) {
		Preview.tooltipHide(false);
	};

	onReactionAdd () {
		const node = $(this.node);

		S.Menu.open('smile', { 
			element: node.find('.reactions .icon.add'),
			horizontal: I.MenuDirection.Center,
			noFlipX: true,
			data: {
				noUpload: true,
				value: '',
				onSelect: icon => this.onReactionSelect(icon),
			}
		});
	};

	onReactionSelect (icon: string) {
		const { rootId, id, data } = this.props;
		const { account } = S.Auth;
		const reactions = data.reactions || [];
		const item = reactions.find(it => it.value == icon);

		if (!item) {
			reactions.push({ value: icon, authors: [ account.id ], count: 1 });
		} else {
			item.authors = item.authors || [];

			if (item.authors.includes(account.id)) {
				item.authors = item.authors.filter(id => id != account.id);
			} else {
				item.authors = item.authors.concat(account.id);
			};
		};

		U.Data.blockSetText(rootId, id, JSON.stringify({ ...data, reactions }), [], true);
	};

});

export default ChatMessage;
