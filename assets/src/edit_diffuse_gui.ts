import { _decorator, Component, EffectAsset, Material, Node, renderer, RenderTexture, resources, settings, Texture2D, Vec4 } from 'cc';
import { BlitPipeline } from './Pipeline';
import { GuiHelper, GuiHelperItem } from './gui_helper';
import { MainGui } from './main_gui';
const { ccclass, property } = _decorator;

@ccclass('EditDiffuseGui')
export class EditDiffuseGui extends Component {
    @property(Material)
    material: Material = null!;
    @property(Material)
    blitMaterial: Material = null!;
    blit2Material: Material = null!;

    @property(Texture2D)
    diffuseMapOriginal: Texture2D;

    @property(Texture2D)
    testImage: Texture2D;

    @property(Texture2D)
    blurMap: Texture2D;

    @property(Texture2D)
    avgMap: Texture2D;

    _imageSizeX: number;
    _imageSizeY: number;

    _slider: number = 0.5;
    _blurContrast: number = 0;
    _lightMaskPow: number = 0;
    _lightPow: number = 0;
    _darkMaskPow: number = 0.5;
    _darkPow: number = 0.0;
    _hotSpot: number = 0;
    _darkSpot: number = 0;
    _finalContrast: number = 1;
    _finalBias: number = 0;
    _colorLerp: number = 0.5;
    _saturation: number = 1.0;

    _blurSize: number = 20.0;
    _avgColorBlurSize: number = 50.0;

    _dir: number = 1;

    _blitMaterial: Material;
    _blurMap: RenderTexture;
    _avgMap: RenderTexture;
    _avgMap2: RenderTexture;
    _tempMap: RenderTexture;
    _avgTempMap: RenderTexture;

    _inBlur: boolean = false;
    _doStuff: boolean = true;

    _buildGui: boolean = false;

    _init = false;


    start () {
        this.init();
        BlitPipeline.instance.mainMat = this.material;
    }


    async init () {
        this._imageSizeX = this.diffuseMapOriginal.width;
        this._imageSizeY = this.diffuseMapOriginal.height;
        // this.blitMaterial = new Material();
        // this.blitMaterial.initialize({
        //     effectName: "blit_shader.effect",
        // });
        await new Promise<void>((resolve) => {
            resources.load("/shader/hidden/blit_shader", EffectAsset, (err: Error, data: EffectAsset) => {
                //获取 effect
                const effectAsset = EffectAsset.get("../resources/shader/hidden/blit_shader");
                this.blitMaterial = new Material();
                this.blitMaterial.initialize({
                    effectAsset
                });
                resolve();
            });

        })

        await new Promise<void>((resolve) => {
            resources.load("/shader/hidden/blit_shader2", EffectAsset, (err: Error, data: EffectAsset) => {
                //获取 effect
                const effectAsset = EffectAsset.get("../resources/shader/hidden/blit_shader2");

                //使用加载好的 effect 初始化材质
                this.blit2Material = new Material();
                this.blit2Material.initialize({ effectAsset });
                resolve();
            });
        });

        this.material.setProperty("mainTex", this.diffuseMapOriginal);
        this._blurMap = new RenderTexture();
        this._blurMap.reset({
            width: this._imageSizeX,
            height: this._imageSizeY
        });

        this._avgMap = new RenderTexture();
        this._avgMap.reset({
            width: this._imageSizeX,
            height: this._imageSizeY
        });

        this._avgMap2 = new RenderTexture();
        this._avgMap2.reset({
            width: this._imageSizeX,
            height: this._imageSizeY
        });


        if (!this._tempMap) {
            this._tempMap = new RenderTexture();
            this._tempMap.reset({
                width: this._imageSizeX,
                height: this._imageSizeY
            });
        }

        this._init = true;
    }


    buildGui () {
        this._buildGui = true;

        GuiHelper.instance.clean();

        GuiHelper.instance.slider("slider", this._slider, 0, 1, (value) => {
            this._slider = value;
        });
        GuiHelper.instance.slider("blurContrast", this._blurContrast, -1, 1, (value) => {
            this._blurContrast = value;
        });
        GuiHelper.instance.slider("lightMaskPow", this._lightMaskPow, 0, 1, (value) => {
            this._lightMaskPow = value;
        });
        GuiHelper.instance.slider("darkMaskPow", this._darkMaskPow, 0, 1, (value) => {
            this._darkMaskPow = value;
        });
        GuiHelper.instance.slider("darkPow", this._darkPow, 0, 1, (value) => {
            this._darkPow = value;
        });
        GuiHelper.instance.slider("hotSpot", this._hotSpot, 0, 1, (value) => {
            this._hotSpot = value;
        });
        GuiHelper.instance.slider("darkSpot", this._darkSpot, 0, 1, (value) => {
            this._darkSpot = value;
        });
        GuiHelper.instance.slider("finalContrast", this._finalContrast, -2, 2, (value) => {
            this._finalContrast = value;
        });
        GuiHelper.instance.slider("finalBias", this._finalBias, -0.5, 0.5, (value) => {
            this._finalBias = value;
        });
        GuiHelper.instance.slider("finalcolorLerpBias", this._colorLerp, 0, 1, (value) => {
            this._colorLerp = value;
        });

        GuiHelper.instance.slider("saturation", this._saturation, 0, 1, (value) => {
            this._saturation = value;
        });
        GuiHelper.instance.slider("blurSize", this._blurSize, 5, 100, (value) => {
            this._blurSize = value;
        });
        GuiHelper.instance.slider("avgColorBlurSize", this._avgColorBlurSize, 5, 100, (value) => {
            this._avgColorBlurSize = Math.floor(value);
            this._doStuff = true;
        });
        GuiHelper.instance.button("Process Diffuse", () => {
            this.processDiffuse();
        });

        // _slider: number = 0.5;
        // _blurContrast: number = 0;
        // _lightMaskPow: number = 0;
        // _lightPow: number = 0;
        // _darkMaskPow: number = 0.5;
        // _darkPow: number = 0.0;
        // _hotSpot: number = 0;
        // _darkSpot: number = 0;
        // _finalContrast: number = 1;
        // _finalBias: number = 0;
        // _colorLerp: number = 0.5;
        // _saturation: number = 1.0;

        // _blurSize: number = 20.0;
        // _avgColorBlurSize: number = 50.0;

        // _dir: number = 1;
    }



    update (deltaTime: number) {
        if (!this._buildGui) {
            this.buildGui();
        }

        if (!this._init) {
            return;
        }

        // this._finalContrast += 0.01 * this._dir;
        // if (this._finalContrast <= -2) {
        //     this._dir = 1;
        // } else if (this._finalContrast >= 2) { 
        //     this._dir = -1;
        // }

        this.processBlur();

        this.material.setProperty("slider", this._slider);
        this.material.setProperty("blurContrast", this._blurContrast);
        this.material.setProperty("lightMaskPow", this._lightMaskPow);
        this.material.setProperty("lightPow", this._lightPow);
        this.material.setProperty("darkMaskPow", this._darkMaskPow);
        this.material.setProperty("darkPow", this._darkPow);
        this.material.setProperty("hotSpot", this._hotSpot);
        this.material.setProperty("darkSpot", this._darkSpot);
        this.material.setProperty("finalContrast", this._finalContrast);
        this.material.setProperty('finalBias', this._finalBias);
        this.material.setProperty("colorLerp", this._colorLerp);
        this.material.setProperty("saturation", this._saturation);
    }

    async processDiffuse () {
        if (this._inBlur) {
            return;
        }
        this._inBlur = true;

        this.blit2Material.setProperty("imageSize", new Vec4(this._imageSizeX, this._imageSizeY, 0, 0));

        this.blit2Material.setProperty("mainTex", this.diffuseMapOriginal);

        this.blit2Material.setProperty("blurTex", this.blurMap);

        this.blit2Material.setProperty("blurContrast", this._blurContrast);

        this.blit2Material.setProperty("avgTex", this.avgMap);

        this.blit2Material.setProperty("slider", 0.5);

        this.blit2Material.setProperty("lightMaskPow", this._lightMaskPow);
        this.blit2Material.setProperty("lightPow", this._lightPow);

        this.blit2Material.setProperty("darkMaskPow", this._darkMaskPow);
        this.blit2Material.setProperty("darkPow", this._darkPow);

        this.blit2Material.setProperty("hotSpot", this._hotSpot);
        this.blit2Material.setProperty("darkSpot", this._darkSpot);

        this.blit2Material.setProperty("finalContrast", this._finalContrast);

        this.blit2Material.setProperty('finalBias', this._finalBias);

        this.blit2Material.setProperty("colorLerp", this._colorLerp);

        this.blit2Material.setProperty("saturation", this._saturation);

        // blitShader2的第三个pass
        if (this._tempMap) {
            this._tempMap.destroy();
        }
        this._tempMap = new RenderTexture();
        this._tempMap.reset({
            width: this._imageSizeX,
            height: this._imageSizeY
        });

        BlitPipeline.instance.blit(this.diffuseMapOriginal, this._tempMap, this.blit2Material, 3);
        await this.delay();
        if (!MainGui.instance._DiffuseMap) {
            MainGui.instance._DiffuseMap = new RenderTexture();
            MainGui.instance._DiffuseMap.reset({
                width: this._imageSizeX,
                height: this._imageSizeY
            });
        }
        // 纯粹拷贝
        BlitPipeline.instance.blit(this._tempMap, MainGui.instance._DiffuseMap, this.blit2Material, 4);
        await this.delay();

        // test
        // this.material.setProperty("mainTex", MainGui.instance._DiffuseMap);

        this._inBlur = false;


        // MainGuiScript._DiffuseMap

        // 使用ctx根据buff生成图片 原生平台无效 pass
        // let buff = this._tempMap.readPixels();
        // let canvas = document.createElement('canvas');
        // canvas.width = this._imageSizeX;
        // canvas.height = this._imageSizeY;
        // let ctx = canvas.getContext('2d');
        // let imageData = ctx.createImageData(this._imageSizeX, this._imageSizeY);
        // imageData.data.set(buff);
        // ctx.putImageData(imageData, 0, 0);
        // let url = canvas.toDataURL('image/png');
        // let img = document.createElement('img');
        // img.src = url;
        // document.body.appendChild(img);


        // CleanupTexture(_TempMap);
        // _TempMap = new RenderTexture(imageSizeX, imageSizeY, 0, RenderTextureFormat.ARGB32, RenderTextureReadWrite.Linear);
        // _TempMap.wrapMode = TextureWrapMode.Repeat;

        // Graphics.Blit(_DiffuseMapOriginal, _TempMap, blitMaterial, 11);

        // RenderTexture.active = _TempMap;

        // if (MainGuiScript._DiffuseMap != null) {
        //     Destroy(MainGuiScript._DiffuseMap);
        //     MainGuiScript._DiffuseMap = null;
        // }

        // MainGuiScript._DiffuseMap = new Texture2D(_TempMap.width, _TempMap.height, TextureFormat.ARGB32, true, true);
        // MainGuiScript._DiffuseMap.ReadPixels(new Rect(0, 0, _TempMap.width, _TempMap.height), 0, 0);
        // MainGuiScript._DiffuseMap.Apply();

        // yield return new WaitForSeconds(0.1f);

        // CleanupTexture(_TempMap);
    }

    async processBlur () {
        if (!this._doStuff) {
            return;
        }
        if (this._inBlur) {
            return;
        }
        this._inBlur = true;

        console.log("Processing Blur");

        // if (this._tempMap) {
        //     this._tempMap.destroy();
        //     this._tempMap = null;
        // }

        this.blitMaterial.setProperty("imageSize", new Vec4(this._imageSizeX, this._imageSizeY, 0, 0));
        this.blitMaterial.setProperty("blurContrast", 1.0);
        this.blitMaterial.setProperty("blurSpread", 1.0);

        // Blur the image 1
        this.blitMaterial.setProperty("blurSamples", this._blurSize);
        this.blitMaterial.setProperty("blurDirection", new Vec4(1.0, 0, 0, 0));
        BlitPipeline.instance.blit(this.diffuseMapOriginal, this._tempMap, this.blitMaterial, 1);
        await this.delay();

        this.blitMaterial.setProperty("blurDirection", new Vec4(0, 1.0, 0, 0));
        BlitPipeline.instance.blit(this._tempMap, this._blurMap, this.blitMaterial, 1);
        await this.delay();
        this.material.setProperty("blurTex", this._blurMap);

        this.blitMaterial.setProperty("mainTex", this.diffuseMapOriginal);
        this.blitMaterial.setProperty("blurSamples", this._avgColorBlurSize);
        this.blitMaterial.setProperty("blurDirection", new Vec4(1.0, 0, 0, 0));
        BlitPipeline.instance.blit(this.diffuseMapOriginal, this._tempMap, this.blitMaterial, 1);
        await this.delay();

        this.blitMaterial.setProperty("blurDirection", new Vec4(0, 1.0, 0, 0));
        BlitPipeline.instance.blit(this._tempMap, this._avgMap, this.blitMaterial, 1);
        await this.delay();

        this.blitMaterial.setProperty("blurSpread", this._avgColorBlurSize / 5.0);
        this.blitMaterial.setProperty("blurDirection", new Vec4(1.0, 0, 0, 0));
        BlitPipeline.instance.blit(this._avgMap, this._tempMap, this.blitMaterial, 1);
        await this.delay();

        this.blitMaterial.setProperty("blurDirection", new Vec4(0, 1.0, 0, 0));
        BlitPipeline.instance.blit(this._tempMap, this._avgMap2, this.blitMaterial, 1);
        await this.delay();

        this.material.setProperty("avgTex", this._avgMap2);


        // if (this._tempMap) {
        //     this._tempMap.destroy();
        //     this._tempMap = null;
        // }

        // if (this._avgTempMap) {
        //     this._avgTempMap.destroy();
        //     this._avgTempMap = null;
        // }

        this._inBlur = false;
        this._doStuff = false;
    }

    async delay (time: number = 17) {
        await new Promise<void>((resolve, reject) => {
            setTimeout(() => {
                resolve();
            }, time);
        })
    }
}

