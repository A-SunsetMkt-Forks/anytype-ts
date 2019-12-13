import { I, Mark, dispatcher } from 'ts/lib';
import { blockStore } from 'ts/store';

const ImageGetBlob = (id: string, size: I.ImageSize, callBack?: (message: any) => void) => {
	const request = {
		id: id,
		size: size
	};
	dispatcher.call('imageGetBlob', request, callBack);
};

const ConfigGet = (callBack?: (message: any) => void) => {
	dispatcher.call('configGet', {}, callBack);
};

const WalletCreate = (path: string, callBack?: (message: any) => void) => {
	const request = {
		rootPath: path,
	};
	dispatcher.call('walletCreate', request, callBack);
};

const WalletRecover = (path: string, mnemonic: string, callBack?: (message: any) => void) => {
	const request = {
		rootPath: path,
		mnemonic: mnemonic,
	};
	dispatcher.call('walletRecover', request, callBack);
};

const AccountCreate = (name: string, path: string, callBack?: (message: any) => void) => {
	const request = {
		name: name, 
		avatarLocalPath: path,
	};
	dispatcher.call('accountCreate', request, callBack);
};

const AccountRecover = (callBack?: (message: any) => void) => {
	dispatcher.call('accountRecover', {}, callBack);
};

const AccountSelect = (id: string, path: string, callBack?: (message: any) => void) => {
	const request = {
		id: id,
		rootPath: path,
	};
	dispatcher.call('accountSelect', request, callBack);
};

const BlockOpen = (blockId: string, callBack?: (message: any) => void) => {
	const request = {
		blockId: blockId,
	};
	dispatcher.call('blockOpen', request, callBack);
};

const BlockClose = (blockId: string, callBack?: (message: any) => void) => {
	const request = {
		blockId: blockId,
	};
	dispatcher.call('blockClose', request, callBack);
};

const BlockCreate = (block: any, contextId: string, parentId: string, targetId: string, position: I.BlockPosition, callBack?: (message: any) => void) => {
	const request = {
		block: blockStore.prepareBlockToProto(block),
		contextId: contextId,
		parentId: parentId,
		targetId: targetId,
		position: position,
	};
	dispatcher.call('blockCreate', request, callBack);
};

const BlockDuplicate = (contextId: string, blockId: string, targetId: string, position: I.BlockPosition, callBack?: (message: any) => void) => {
	const request = {
		contextId: contextId,
		blockId: blockId,
		targetId: targetId,
		position: position,
	};
	dispatcher.call('blockDuplicate', request, callBack);
};

const BlockUnlink = (contextId: string, targets: any[], callBack?: (message: any) => void) => {
	const request = {
		contextId: contextId,
		targets: targets,
	};
	dispatcher.call('blockUnlink', request, callBack);
};

const BlockSetIconName = (contextId: string, blockId: string, name: string, callBack?: (message: any) => void) => {
	const request = {
		contextId: contextId,
		blockId: blockId,
		name: name,
	};
	dispatcher.call('blockSetIconName', request, callBack);
};

const BlockSetTextStyle = (contextId: string, blockId: string, style: I.TextStyle, callBack?: (message: any) => void) => {
	const request = {
		contextId: contextId,
		blockId: blockId,
		style: style,
	};
	dispatcher.call('BlockSetTextStyle', request, callBack);
};

const BlockSetTextText = (contextId: string, blockId: string, text: string, marks: I.Mark[], callBack?: (message: any) => void) => {
	const request = {
		contextId: contextId,
		blockId: blockId,
		text: text,
		marks: { marks: Mark.checkRanges(text, marks) },
	};
	dispatcher.call('blockSetTextText', request, callBack);
};

const BlockSetTextChecked = (contextId: string, blockId: string, checked: boolean, callBack?: (message: any) => void) => {
	const request = {
		contextId: contextId,
		blockId: blockId,
		checked: checked,
	};
	dispatcher.call('blockSetTextChecked', request, callBack);
};

const BlockListMove = (contextId: string, blockIds: string[], targetId: string, position: I.BlockPosition, callBack?: (message: any) => void) => {
	const request = {
		contextId: contextId,
		blockIds: blockIds,
		dropTargetId: targetId,
		position: position,
	};
	dispatcher.call('blockListMove', request, callBack);
};

const BlockMerge = (contextId: string, blockId1: string, blockId2: string, callBack?: (message: any) => void) => {
	const request = {
		contextId: contextId,
		firstBlockId: blockId1,
		secondBlockId: blockId2,
	};
	dispatcher.call('blockMerge', request, callBack);
};

const BlockSplit = (contextId: string, blockId: string, position: number, callBack?: (message: any) => void) => {
	const request = {
		contextId: contextId,
		blockId: blockId,
		cursorPosition: position,
	};
	dispatcher.call('blockSplit', request, callBack);
};

const BlockUpload = (contextId: string, blockId: string, url: string, path: string, callBack?: (message: any) => void) => {
	const request: any = {
		contextId: contextId,
		blockId: blockId,
	};
	if (url) {
		request.url = url;
	};
	if (path) {
		request.filePath = path;
	};
	dispatcher.call('blockUpload', request, callBack);	
};

export {
	ImageGetBlob,
	ConfigGet,
	
	WalletCreate,
	WalletRecover,
	
	AccountCreate,
	AccountRecover,
	AccountSelect,
	
	BlockOpen,
	BlockClose,
	BlockCreate,
	BlockDuplicate,
	BlockUnlink,
	BlockSetIconName,
	BlockListMove,
	BlockMerge,
	BlockSplit,
	BlockUpload,
	
	BlockSetTextStyle,
	BlockSetTextText,
	BlockSetTextChecked,
};