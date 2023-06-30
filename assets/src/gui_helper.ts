import { _decorator, Button, Component, instantiate, Label, Node, Slider, Toggle, Widget } from 'cc';
const { ccclass, property } = _decorator;


export enum GuiHelperItemType {
    Button,
    Toggle,
    Slider,
}

export interface GuiHelperItem {
    type: number,
    desc: string,
    callBack: Function,
    value?: number,
    node?: Node
    min?: number
    max?: number
}

@ccclass('GuiHelper')
export class GuiHelper extends Component {
    _btnClone: Node;
    _toggleClone: Node;
    _sliderClone: Node;

    _itemList: GuiHelperItem[] = [];
    public static instance: GuiHelper;

    onLoad () {
        GuiHelper.instance = this;
        this._btnClone = this.node.getChildByName('btn');
        this._toggleClone = this.node.getChildByName('toggle');
        this._sliderClone = this.node.getChildByName('slider');
    }

    log (str: string) {
        this.node.parent.getChildByName("Label").getComponent(Label).string = str;
    }

    clean () {
        this._itemList.forEach((item: GuiHelperItem) => {
            item.node.removeFromParent();
        });
        this._itemList.length = 0;
    }

    buildGuiItems (list: GuiHelperItem[]) {
        this.clean();

        list.forEach((item: GuiHelperItem) => {
            try {
                item.node = this.creatorGuiItem(item);
                this._itemList.push(item);

                item.node.parent = this.node;
            } catch (e) {
                this.log(e)
            }
        });

        this.getComponent(Widget).updateAlignment();
        //   this.log("updateAlignment")
    }

    updateGuiItem (item: GuiHelperItem) {
        let index = this._itemList.findIndex((it) => {
            return it.desc == item.desc
        });
        if (index == -1) {
            item.node = this.creatorGuiItem(item);
            this._itemList.push(item);

            item.node.parent = this.node;
        } else {
            item.node = this._itemList[index].node;
            this._itemList[index] = item;

            item.node.off("click");
            item.node.off("toggle");
            item.node.off("slide");

            if (item.type == GuiHelperItemType.Button) {
                item.node.on('click', item.callBack);
            } else if (item.type == GuiHelperItemType.Toggle) {
                item.node.on('toggle', item.callBack);
            } else if (item.type == GuiHelperItemType.Slider) {
                item.node.on('slide', (sl: Slider) => {
                    let value = sl.progress * (item.max - item.min) + item.min;
                    item.node.getChildByName("value").getComponent(Label).string = "" + value.toFixed(2);

                    this.log(`change ${item.desc} to ${value}}`);
                    item.callBack(value);
                });
            }
            // update callBack 
        }
    }

    creatorGuiItem (item: GuiHelperItem) {
        let node: Node = null;
        if (item.type == GuiHelperItemType.Button) {
            node = instantiate(this._btnClone);
            node.active = true;
            node.getChildByName("desc").getComponent(Label).string = item.desc;

            let btn = node.getComponent(Button);
            btn.node.on('click', item.callBack);
            return node;
        } else if (item.type == GuiHelperItemType.Toggle) {
            node = instantiate(this._toggleClone);
            node.active = true;
            node.getChildByName("desc").getComponent(Label).string = item.desc;
            let toggle = node.getChildByName("Toggle").getComponent(Toggle);
            toggle.isChecked = item.value == 1;
            toggle.node.on('toggle', item.callBack);
            return node;
        } else if (item.type == GuiHelperItemType.Slider) {
            node = instantiate(this._sliderClone);
            node.active = true;
            node.getChildByName("desc").getComponent(Label).string = item.desc;

            let slider = node.getChildByName("Slider").getComponent(Slider);
            slider.progress = (item.value - item.min) / (item.max - item.min);
            node.getChildByName("value").getComponent(Label).string = item.value.toFixed(2);

            slider.node.on('slide', (sl: Slider) => {
                let value = sl.progress * (item.max - item.min) + item.min;
                node.getChildByName("value").getComponent(Label).string = "" + value.toFixed(2);

                this.log(`change ${item.desc} to ${value}}`);
                item.callBack(value);
            });
            return node;
        }
    }

    slider (desc: string, value: number, min: number, max: number, callBack: Function) {
        this.updateGuiItem({ type: GuiHelperItemType.Slider, desc, value, callBack, min, max });
    }

    toggle (desc: string, value: boolean, callBack: Function) {
        this.updateGuiItem({ type: GuiHelperItemType.Toggle, desc, value: (value ? 1 : 0), callBack });
    }

    button (desc: string, callBack: Function) {
        this.updateGuiItem({ type: GuiHelperItemType.Button, desc, callBack });
    }

    reSize () {
        this.getComponent(Widget).updateAlignment();
    }

}