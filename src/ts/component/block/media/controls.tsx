import * as React from 'react';
import { observer } from 'mobx-react';
import $ from 'jquery';
import { Icon, Drag } from 'Component';
import { I, Util} from 'Lib';
import { commonStore } from 'Store';
import Constant from 'json/constant.json';

const BlockAudioControls = observer(class BlockAudioControls extends React.Component<I.BlockComponent> {

    _isMounted = false;
    node: any = null;
    volume = 0;
    playOnSeek = false;
    refTime: any = null;
    refVolume: any = null;
    audioNode: HTMLAudioElement;

    constructor (props: I.BlockComponent) {
        super(props);

        this.onPlay = this.onPlay.bind(this);
        this.onMute = this.onMute.bind(this);
    };

    render () {
        const { block } = this.props;
        const { content } = block;
        const { name } = content;

        return (
            <div className="audioControls">
                <Icon className="play" onClick={this.onPlay} />
                <div className="name">
                    <span>{name}</span>
                </div>

                <Drag
                    id="time"
                    ref={(ref: any) => { this.refTime = ref; }}
                    value={0}
                    onStart={(e: any, v: number) => { this.onTime(v); }}
                    onMove={(e: any, v: number) => { this.onTime(v); }}
                    onEnd={(e: any, v: number) => { this.onTimeEnd(v); }}
                />

                <div className="time">
                    <span id="timeCurrent" className="current">0:00</span>&nbsp;/&nbsp;
                    <span id="timeTotal" className="total">0:00</span>
                </div>

                <Icon className="volume" onClick={this.onMute} />
                <Drag
                    id="volume"
                    ref={(ref: any) => { this.refVolume = ref; }}
                    value={1}
                    onMove={(e: any, v: number) => { this.onVolume(v); }}
                />
            </div>
        );
    };

    componentDidMount () {
        this._isMounted = true;

        const { block } = this.props;
        this.node = $('#blockAudio-' + block.id);

        this.resize();
        this.rebind();
    };

    componentDidUpdate () {
        this.resize();
        this.rebind();
    };

    componentWillUnmount () {
        this._isMounted = false;
        this.unbind();
    };

    rebind () {
        if (!this._isMounted) {
            return;
        };

        this.unbind();

        const node = $(this.node);
        const icon = node.find('.icon.play');
        const el = node.find('#audio');
        this.audioNode = el.get(0) as HTMLAudioElement;

        node.on('resize', (e: any, oe: any) => { this.resize(); });

        if (el.length) {
            el.on('canplay timeupdate', () => { this.onTimeUpdate(); });
            el.on('play', () => {
                node.addClass('isPlaying');
                icon.addClass('active');
            });
            el.on('ended pause', () => {
                node.removeClass('isPlaying');
                icon.removeClass('active');
            });
        };
    };

    unbind () {
        if (!this._isMounted) {
            return;
        };

        const node = $(this.node);
        const el = node.find('#audio');

        if (el.length) {
            el.off('canplay timeupdate play ended pause');
        };
    };

    resize () {
        if (!this._isMounted) {
            return;
        };

        if (this.refTime) {
            this.refTime.resize();
        };

        if (this.refVolume) {
            this.refVolume.resize();
        };
    };

    onPlay () {
        if (!this._isMounted) {
            return;
        };

        const el = this.audioNode;
        const paused = el.paused;

        $('audio, video').each((i: number, item: any) => { item.pause(); });
        paused ? this.play() : this.pause();
    };

    play () {
        if (!this._isMounted) {
            return;
        };

        this.audioNode.play();
    };

    pause () {
        if (!this._isMounted) {
            return;
        };

        this.audioNode.pause();
    };

    onMute () {
        if (!this._isMounted) {
            return;
        };

        const el = this.audioNode;

        el.volume = el.volume ? 0 : (this.volume || 1);

        this.refVolume.setValue(el.volume);
        this.setVolumeIcon();
    };

    onVolume (v: number) {
        if (!this._isMounted) {
            return;
        };

        const el = this.audioNode;

        this.volume = el.volume = v;
        this.setVolumeIcon();
    };

    setVolumeIcon () {
        if (!this._isMounted) {
            return;
        };

        const el = this.audioNode;
        const node = $(this.node);
        const icon = node.find('.icon.volume');

        el.volume ? icon.removeClass('active') : icon.addClass('active');
    };

    onTime (v: number) {
        if (!this._isMounted) {
            return;
        };

        const el = this.audioNode;
        const paused = el.paused;

        if (!paused) {
            this.pause();
            this.playOnSeek = true;
        };

        el.currentTime = Number(v * el.duration) || 0;
    };

    onTimeEnd (v: number) {
        if (this.playOnSeek) {
            this.play();
        };
    };

    onTimeUpdate () {
        if (!this._isMounted) {
            return;
        };

        const el = this.audioNode;
        if (!el) {
            return;
        };

        const node = $(this.node);
        const current = node.find('.time .current');
        const total = node.find('.time .total');

        let t = this.getTime(el.currentTime);
        current.text(`${Util.sprintf('%02d', t.m)}:${Util.sprintf('%02d', t.s)}`);

        t = this.getTime(el.duration);
        total.text(`${Util.sprintf('%02d', t.m)}:${Util.sprintf('%02d', t.s)}`);

        this.refTime.setValue(el.currentTime / el.duration);
    };

    getTime (t: number): { m: number, s: number } {
        let m = Math.floor(t / 60);

        t -= m * 60;
        let s = Math.floor(t);

        return { m, s };
    };

});

export default BlockAudioControls;