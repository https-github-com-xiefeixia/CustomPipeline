import { _decorator, Color, Component, Material, Mesh, MeshRenderer, Node, Rect, gfx, RenderTexture, settings, Texture2D, Vec2, Vec4, math } from 'cc';
import { BlitPipeline } from './Pipeline';
import { MainGui } from './main_gui';
import { GuiHelper, GuiHelperItem } from './gui_helper';
const { ccclass, property } = _decorator;

export class HeightFromDiffuseSettings {
    public useAdjustedDiffuse: boolean = true;
    public useOriginalDiffuse: boolean = false;
    public useNormal: boolean = false;

    public blur0Weight: number = 0.15;
    public blur1Weight: number = 0.19;
    public blur2Weight: number = 0.3;
    public blur3Weight: number = 0.5;
    public blur4Weight: number = 0.7;
    public blur5Weight: number = 0.9;
    public blur6Weight: number = 1.0;

    public blur0Contrast: number = 1.0;
    public blur1Contrast: number = 1.0;
    public blur2Contrast: number = 1.0;
    public blur3Contrast: number = 1.0;
    public blur4Contrast: number = 1.0;
    public blur5Contrast: number = 1.0;
    public blur6Contrast: number = 1.0;

    public finalContrast: number = 1.5;
    public finalBias: number = 0.0;
    public finalGain: number = 0.0

    public sampleColor1: Color = Color.BLACK;
    public sampleUV1: Vec2 = new Vec2;
    public useSample1: boolean = false;

    public isolateSample1: boolean = false;
    public hueWeight1: number = 1.0;
    public satWeight1: number = 0.5;
    public lumWeight1: number = 0.2;
    public maskLow1: number = 0.0;
    public maskHigh1: number = 0.5;
    public sample1Height: number = 0.0;


    public sampleColor2: Color = Color.BLACK;
    public sampleUV2: Vec2 = new Vec2;
    public useSample2: boolean = false;

    public isolateSample2: boolean = false;
    public hueWeight2: number = 1.0;
    public satWeight2: number = 0.5;
    public lumWeight2: number = 0.2;
    public maskLow2: number = 0.0;
    public maskHigh2: number = 0.5;
    public sample2Heigh: number = 0.0;

    public sampleBlend: number = 0.5
    public spread: number = 50;
    public spreadBoost: number = 1.0;
}
const HFDS = new HeightFromDiffuseSettings();

@ccclass('HeightFromDiffuseGui')
export class HeightFromDiffuseGui extends Component {
    @property(Node)
    testObject: Node;
    @property(Material)
    public material: Material;

    // public mainGui:
    private _tempBlurMap: RenderTexture;
    private _blurMap0: RenderTexture;
    private _blurMap1: RenderTexture;
    private _blurMap2: RenderTexture;
    private _blurMap3: RenderTexture;
    private _blurMap4: RenderTexture;
    private _blurMap5: RenderTexture;
    private _blurMap6: RenderTexture;
    private _tempHeightMap: RenderTexture;
    private _avgTempMap: RenderTexture;
    private _avgMap: RenderTexture;


    private _blurScale: number = 1.0;
    private imageSizeX = 1024;
    private imageSizeY = 1024;


    public blitMaterial: Material;
    public blitMaterialSample: Material;
    public blitMaterialNormal: Material;


    public currentSelection = 0;
    public selectingColor = false;
    public mouseButtonDown = false;

    private _SampleColorMap1: Texture2D;  // 不知道干啥用，用颜色选择盘？
    private _SampleColorMap2: Texture2D;  // 

    private _slider = 0.5;

    public lastUseDiffuse = false;
    public lastUseOriginalDiffuse = false;
    public lastUseNormal = false;
    public lastBlur0Contrast = 1.0;

    public doStuff = false;
    public newTexture = false;

    public windowRect: Rect = new Rect(30, 300, 300, 480);
    public settingsInitialized = false;

    public busy = false;

    initializeSettings () {
        // if (_SampleColorMap1) {
        //     Destroy(_SampleColorMap1);
        // }
        // _SampleColorMap1 = new Texture2D(1, 1, TextureFormat.ARGB32, false, true);
        // _SampleColorMap1.SetPixel(1, 1, HFDS.SampleColor1);
        // _SampleColorMap1.Apply();

        // if (_SampleColorMap2) {
        //     Destroy(_SampleColorMap2);
        // }
        // _SampleColorMap2 = new Texture2D(1, 1, TextureFormat.ARGB32, false, true);
        // _SampleColorMap2.SetPixel(1, 1, HFDS.SampleColor2);
        // _SampleColorMap2.Apply();

        // SampleColorMap1 与 SampleColorMap2 需要利用ctx来生成texutre2d

        this.settingsInitialized = true;

        this.buildGui();
    }

    start () {
        let meshRenderer = this.testObject.getComponent(MeshRenderer);
        meshRenderer.material = this.material;

        this.blitMaterial = new Material();
        this.blitMaterialSample = new Material();
        this.blitMaterialNormal = new Material();

        this.blitMaterial.initialize({
            effectName: "blit_shader",
        });
        this.blitMaterialSample.initialize({
            effectName: "blit_sample",
        });
        this.blitMaterialNormal.initialize({
            effectName: "blit_height_from_normal",
        });

        this.initializeSettings();

        if (this.newTexture) {
            this.initializeTextures();
            this.newTexture = false;
        }

        this.fixUseMaps();

        this.lastUseDiffuse = HFDS.useAdjustedDiffuse;
        this.lastUseOriginalDiffuse = HFDS.useOriginalDiffuse;
        this.lastUseNormal = HFDS.useNormal;
        this.lastBlur0Contrast = HFDS.blur0Contrast;

        this.setMaterialValues();

        // 测试需要设置MainGui._DiffuseMap
    }

    setMaterialValues () {
        this.material.setProperty("blurScale", this._blurScale);
        this.material.setProperty("imageSize", new Vec4(this.imageSizeX, this.imageSizeY, 0, 0));

    }

    initializeTextures () {
        this.testObject.getComponent(MeshRenderer).material = this.material;

        this.cleanupTextures();

        this.fixUseMaps();

        if (HFDS.useAdjustedDiffuse) {
            this.imageSizeX = MainGui.instance._DiffuseMap.width;
            this.imageSizeY = MainGui.instance._DiffuseMap.height;
        }
        else if (HFDS.useOriginalDiffuse) {
            this.imageSizeX = MainGui.instance._DiffuseMapOriginal.width;
            this.imageSizeY = MainGui.instance._DiffuseMapOriginal.height;
        }
        else if (HFDS.useNormal) {
            this.imageSizeX = MainGui.instance._NormalMap.width;
            this.imageSizeY = MainGui.instance._NormalMap.height;
        }


        this._tempBlurMap = this.initializeTexture();
        this._blurMap0 = this.initializeTexture();
        this._blurMap1 = this.initializeTexture();
        this._blurMap2 = this.initializeTexture();
        this._blurMap3 = this.initializeTexture();
        this._blurMap4 = this.initializeTexture();
        this._blurMap5 = this.initializeTexture();
        this._blurMap6 = this.initializeTexture();
        this._avgMap = this.initializeTexture();
        this._avgTempMap = this.initializeTexture();

        this.setMaterialValues();
    }

    cleanupTexture (texture: RenderTexture) {
        if (texture != null) {
            texture.destroy();
            texture = null;
        }
    }

    initializeTexture () {
        let tempMap = new RenderTexture();
        const renderTextureOptions = {
            width: this.imageSizeX,
            height: this.imageSizeY,
            //    externalFlag: gfx.TextureFlagBit.EXTERNAL_NORMAL
        };
        tempMap.initialize(renderTextureOptions);
        tempMap.setWrapMode(RenderTexture.WrapMode.REPEAT, RenderTexture.WrapMode.REPEAT, RenderTexture.WrapMode.REPEAT);
        tempMap.setFilters(RenderTexture.Filter.LINEAR, RenderTexture.Filter.LINEAR);
        return tempMap;
    }

    cleanupTextures () {
        console.log("Cleaning Up Textures");
        this.cleanupTexture(this._tempBlurMap);
        this.cleanupTexture(this._blurMap0);
        this.cleanupTexture(this._blurMap1);
        this.cleanupTexture(this._blurMap2);
        this.cleanupTexture(this._blurMap3);
        this.cleanupTexture(this._blurMap4);
        this.cleanupTexture(this._blurMap5);
        this.cleanupTexture(this._blurMap6);
        this.cleanupTexture(this._tempHeightMap);
        this.cleanupTexture(this._avgMap);
        this.cleanupTexture(this._avgTempMap);
    }

    public async processHeight () {
        this.busy = true;
        console.log("Processing Height");

        this.blitMaterial.setProperty("imageSize", new Vec4(this.imageSizeX, this.imageSizeY, 0, 0));

        // this.cleanupTexture(this._tempHeightMap);
        // _TempHeightMap = new RenderTexture(imageSizeX, imageSizeY, 0, RenderTextureFormat.ARGB32, RenderTextureReadWrite.Linear);
        // _TempHeightMap.wrapMode = TextureWrapMode.Repeat;

        this.blitMaterial.setProperty("finalContrast", HFDS.finalContrast);
        this.blitMaterial.setProperty("finalBias", HFDS.finalBias);

        let realGain = HFDS.finalGain;
        if (realGain < 0.0) {
            realGain = Math.abs(1.0 / (realGain - 1.0));
        } else {
            realGain = realGain + 1.0;
        }
        this.blitMaterial.setProperty("finalGain", realGain);

        if (HFDS.useNormal) {

            this.blitMaterial.setProperty("blurTex0", this._blurMap0);
            this.blitMaterial.setProperty("heightFromNormal", 1.0);
            // Save low fidelity for texture 2d
            //    Graphics.Blit(_blurMap0, _TempHeightMap, this.blitMaterial, 2);
            BlitPipeline.instance.blit(this._blurMap0, this._tempHeightMap, this.blitMaterial, 2);
            await this.delay();
        }
        else {
            this.blitMaterial.setProperty("heightFromNormal", 0.0);

            this.blitMaterial.setProperty("blur0Weight", HFDS.blur0Weight);
            this.blitMaterial.setProperty("blur1Weight", HFDS.blur1Weight);
            this.blitMaterial.setProperty("blur2Weight", HFDS.blur2Weight);
            this.blitMaterial.setProperty("blur3Weight", HFDS.blur3Weight);
            this.blitMaterial.setProperty("blur4Weight", HFDS.blur4Weight);
            this.blitMaterial.setProperty("blur5Weight", HFDS.blur5Weight);
            this.blitMaterial.setProperty("blur6Weight", HFDS.blur6Weight);

            this.blitMaterial.setProperty("blur0Contrast", HFDS.blur0Contrast);
            this.blitMaterial.setProperty("blur1Contrast", HFDS.blur1Contrast);
            this.blitMaterial.setProperty("blur2Contrast", HFDS.blur2Contrast);
            this.blitMaterial.setProperty("blur3Contrast", HFDS.blur3Contrast);
            this.blitMaterial.setProperty("blur4Contrast", HFDS.blur4Contrast);
            this.blitMaterial.setProperty("blur5Contrast", HFDS.blur5Contrast);
            this.blitMaterial.setProperty("blur6Contrast", HFDS.blur6Contrast);

            this.blitMaterial.setProperty("blurTex0", this._blurMap0);
            this.blitMaterial.setProperty("blurTex1", this._blurMap1);
            this.blitMaterial.setProperty("blurTex2", this._blurMap2);
            this.blitMaterial.setProperty("blurTex3", this._blurMap3);
            this.blitMaterial.setProperty("blurTex4", this._blurMap4);
            this.blitMaterial.setProperty("blurTex5", this._blurMap5);
            this.blitMaterial.setProperty("blurTex6", this._blurMap6);

            this.blitMaterial.setProperty("_AvgTex", this._avgMap);

            // Save low fidelity for texture 2d
            BlitPipeline.instance.blit(this._blurMap0, this._tempHeightMap, this.blitMaterial, 2);
            await this.delay();
        }


        // if (MainGui.instance._HeightMap != null) {
        //     MainGui.instance._HeightMap.destroy();
        // }

        //   RenderTexture.active = _TempHeightMap;
        // MainGui.instance._HeightMap = new Texture2D(_TempHeightMap.width, _TempHeightMap.height, TextureFormat.ARGB32, true, true);
        // MainGui.instance._HeightMap.ReadPixels(new Rect(0, 0, _TempHeightMap.width, _TempHeightMap.height), 0, 0);
        // MainGui.instance._HeightMap.Apply();
        //   RenderTexture.active = null;

        //  Save high fidelity for normal making
        // if (MainGui.instance._HDHeightMap != null) {
        //     MainGui.instance._HDHeightMap.destroy();
        //     MainGui.instance._HDHeightMap = null;
        // }
        // MainGui.instance._HDHeightMap = new RenderTexture(_TempHeightMap.width, _TempHeightMap.height, 0, RenderTextureFormat.RHalf, RenderTextureReadWrite.Linear);
        // MainGui.instance._HDHeightMap.wrapMode = TextureWrapMode.Repeat;

        MainGui.instance._HDHeightMap = this.initializeTexture();
        BlitPipeline.instance.blit(this._blurMap0, MainGui.instance._HDHeightMap, this.blitMaterial, 2);

        this.cleanupTexture(this._tempHeightMap);

        await this.delay();

        this.busy = false;
    }

    public async processNormal () {
        this.busy = true;

        console.log("Processing Normal");

        this.blitMaterialNormal.setProperty("imageSize", new Vec4(this.imageSizeX, this.imageSizeY, 0, 0));
        this.blitMaterialNormal.setProperty("spread", HFDS.spread);
        this.blitMaterialNormal.setProperty("spreadBoost", HFDS.spreadBoost);
        this.blitMaterialNormal.setProperty("samples", HFDS.spread);
        this.blitMaterialNormal.setProperty("mainTex", MainGui.instance._NormalMap);
        this.blitMaterialNormal.setProperty("blendTex", this._blurMap1);

        this.material.setProperty("isNormal", 1.0);
        this.material.setProperty("blurTex0", this._blurMap0);
        this.material.setProperty("blurTex1", this._blurMap1);
        this.material.setProperty("mainTex", MainGui.instance._NormalMap);

        let yieldCountDown = 5;

        for (let i = 1; i < 100; i++) {
            this.blitMaterialNormal.setProperty("blendAmount", 1.0 / i);
            this.blitMaterialNormal.setProperty("progress", i / 100.0);

            BlitPipeline.instance.blit(MainGui.instance._NormalMap, this._blurMap0, this.blitMaterialNormal, 0);
            await this.delay();

            BlitPipeline.instance.blit(this._blurMap0, this._blurMap1);
            await this.delay();

            yieldCountDown -= 1;
            if (yieldCountDown <= 0) {
                yieldCountDown = 5;
                await this.delay()
            }
        }

        this.busy = false;
    }

    fixUseMaps () {
        if (MainGui.instance._DiffuseMapOriginal == null && HFDS.useOriginalDiffuse) {
            HFDS.useAdjustedDiffuse = true;
            HFDS.useOriginalDiffuse = false;
            HFDS.useNormal = false;
        }

        if (MainGui.instance._DiffuseMap == null && HFDS.useAdjustedDiffuse) {
            HFDS.useAdjustedDiffuse = false;
            HFDS.useOriginalDiffuse = true;
            HFDS.useNormal = false;
        }

        if (MainGui.instance._NormalMap == null && HFDS.useNormal) {
            HFDS.useAdjustedDiffuse = true;
            HFDS.useOriginalDiffuse = false;
            HFDS.useNormal = false;
        }

        if (MainGui.instance._DiffuseMapOriginal == null && MainGui.instance._NormalMap == null) {
            HFDS.useAdjustedDiffuse = true;
            HFDS.useOriginalDiffuse = false;
            HFDS.useNormal = false;
        }

        if (MainGui.instance._DiffuseMap == null && MainGui.instance._NormalMap == null) {
            HFDS.useAdjustedDiffuse = false;
            HFDS.useOriginalDiffuse = true;
            HFDS.useNormal = false;
        }

        if (MainGui.instance._DiffuseMap == null && MainGui.instance._DiffuseMapOriginal == null) {
            HFDS.useAdjustedDiffuse = false;
            HFDS.useOriginalDiffuse = false;
            HFDS.useNormal = true;
        }
    }

    public async processDiffuse () {
        this.busy = true;

        console.log("Processing Diffuse");

        this.material.setProperty("isNormal", 0.0);

        if (HFDS.isolateSample1) {
            this.blitMaterialSample.setProperty("isolateSample1", 1);
        } else {
            this.blitMaterialSample.setProperty("isolateSample1", 0);
        }
        if (HFDS.useSample1) {
            this.blitMaterialSample.setProperty("useSample1", 1);
        } else {
            this.blitMaterialSample.setProperty("useSample1", 0);
        }
        this.blitMaterialSample.setProperty("sampleColor1", HFDS.sampleColor1);
        this.blitMaterialSample.setProperty("sampleUV1", new Vec4(HFDS.sampleUV1.x, HFDS.sampleUV1.y, 0, 0));
        this.blitMaterialSample.setProperty("hueWeight1", HFDS.hueWeight1);
        this.blitMaterialSample.setProperty("satWeight1", HFDS.satWeight1);
        this.blitMaterialSample.setProperty("lumWeight1", HFDS.lumWeight1);
        this.blitMaterialSample.setProperty("maskLow1", HFDS.maskLow1);
        this.blitMaterialSample.setProperty("maskHigh1", HFDS.maskHigh1);
        this.blitMaterialSample.setProperty("sample1Height", HFDS.sample1Height);

        if (HFDS.isolateSample2) {
            this.blitMaterialSample.setProperty("isolateSample2", 1);
        } else {
            this.blitMaterialSample.setProperty("isolateSample2", 0);
        }
        if (HFDS.useSample2) {
            this.blitMaterialSample.setProperty("useSample2", 1);
        } else {
            this.blitMaterialSample.setProperty("useSample2", 0);
        }
        this.blitMaterialSample.setProperty("sampleColor2", HFDS.sampleColor2);
        this.blitMaterialSample.setProperty("sampleUV2", new Vec4(HFDS.sampleUV2.x, HFDS.sampleUV2.y, 0, 0));
        this.blitMaterialSample.setProperty("hueWeight2", HFDS.hueWeight2);
        this.blitMaterialSample.setProperty("satWeight2", HFDS.satWeight2);
        this.blitMaterialSample.setProperty("lumWeight2", HFDS.lumWeight2);
        this.blitMaterialSample.setProperty("maskLow2", HFDS.maskLow2);
        this.blitMaterialSample.setProperty("maskHigh2", HFDS.maskHigh2);
        this.blitMaterialSample.setProperty("sample2Height", HFDS.sample2Heigh);

        if (HFDS.useSample1 == false && HFDS.useSample2 == false) {
            this.blitMaterialSample.setProperty("sampleBlend", 0.0);
        } else {
            this.blitMaterialSample.setProperty("sampleBlend", HFDS.sampleBlend);
        }

        this.blitMaterialSample.setProperty("finalContrast", HFDS.finalContrast);
        this.blitMaterialSample.setProperty("finalBias", HFDS.finalBias);

        if (HFDS.useOriginalDiffuse) {
            BlitPipeline.instance.blit(MainGui.instance._DiffuseMapOriginal, this._blurMap0, this.blitMaterialSample, 0);
            await this.delay();
        } else {
            BlitPipeline.instance.blit(MainGui.instance._DiffuseMap, this._blurMap0, this.blitMaterialSample, 0);
            await this.delay();
        }

        this.blitMaterial.setProperty("imageSize", new Vec4(this.imageSizeX, this.imageSizeY, 0, 0));
        this.blitMaterial.setProperty("blurContrast", 1.0);

        let extraSpread = ((this._blurMap0.width + this._blurMap0.height) * 0.5) / 1024.0;
        let spread = 1.0;

        // Blur the image 1
        this.blitMaterial.setProperty("blurSamples", 4);
        this.blitMaterial.setProperty("blurSpread", spread);
        this.blitMaterial.setProperty("blurDirection", new Vec4(1, 0, 0, 0));

        BlitPipeline.instance.blit(this._blurMap0, this._tempBlurMap, this.blitMaterial, 1);
        await this.delay();

        this.blitMaterial.setProperty("blurDirection", new Vec4(0, 1, 0, 0));
        BlitPipeline.instance.blit(this._tempBlurMap, this._blurMap1, this.blitMaterial, 1);
        await this.delay();

        spread += extraSpread;

        // Blur the image 2
        this.blitMaterial.setProperty("blurSpread", spread);
        this.blitMaterial.setProperty("blurDirection", new Vec4(1, 0, 0, 0));

        BlitPipeline.instance.blit(this._blurMap1, this._tempBlurMap, this.blitMaterial, 1);
        await this.delay();

        this.blitMaterial.setProperty("blurDirection", new Vec4(0, 1, 0, 0));

        BlitPipeline.instance.blit(this._tempBlurMap, this._blurMap2, this.blitMaterial, 1);  // 这里的tempBlurMap 可能需要新处理一张
        await this.delay();

        spread += 2 * extraSpread;

        // Blur the image 3
        this.blitMaterial.setProperty("blurSpread", spread);
        this.blitMaterial.setProperty("blurDirection", new Vec4(1, 0, 0, 0));

        BlitPipeline.instance.blit(this._blurMap2, this._tempBlurMap, this.blitMaterial, 1);
        await this.delay();

        this.blitMaterial.setProperty("blurDirection", new Vec4(0, 1, 0, 0));

        BlitPipeline.instance.blit(this._tempBlurMap, this._blurMap3, this.blitMaterial, 1);
        await this.delay();

        spread += 4 * extraSpread;

        // Blur the image 4
        this.blitMaterial.setProperty("blurSpread", spread);
        this.blitMaterial.setProperty("blurDirection", new Vec4(1, 0, 0, 0));

        BlitPipeline.instance.blit(this._blurMap3, this._tempBlurMap, this.blitMaterial, 1);
        await this.delay();

        this.blitMaterial.setProperty("blurDirection", new Vec4(0, 1, 0, 0));
        BlitPipeline.instance.blit(this._tempBlurMap, this._blurMap4, this.blitMaterial, 1);
        await this.delay();

        spread += 8 * extraSpread;

        // Blur the image 5
        this.blitMaterial.setProperty("blurSpread", spread);
        this.blitMaterial.setProperty("blurDirection", new Vec4(1, 0, 0, 0));
        BlitPipeline.instance.blit(this._blurMap4, this._tempBlurMap, this.blitMaterial, 1);
        await this.delay();


        this.blitMaterial.setProperty("blurDirection", new Vec4(0, 1, 0, 0));
        BlitPipeline.instance.blit(this._tempBlurMap, this._blurMap5, this.blitMaterial, 1);
        await this.delay();

        spread += 16 * extraSpread;

        // Blur the image 6
        this.blitMaterial.setProperty("blurSpread", spread);
        this.blitMaterial.setProperty("blurDirection", new Vec4(1, 0, 0, 0));
        BlitPipeline.instance.blit(this._blurMap5, this._tempBlurMap, this.blitMaterial, 1);
        await this.delay();

        this.blitMaterial.setProperty("blurDirection", new Vec4(0, 1, 0, 0));
        BlitPipeline.instance.blit(this._tempBlurMap, this._blurMap6, this.blitMaterial, 1);
        await this.delay();

        // Average Color
        this.blitMaterial.setProperty("blurSamples", 32);
        this.blitMaterial.setProperty("blurSpread", 64.0 * extraSpread);
        this.blitMaterial.setProperty("blurDirection", new Vec4(1, 0, 0, 0));
        BlitPipeline.instance.blit(this._blurMap6, this._avgTempMap, this.blitMaterial, 1);
        await this.delay();

        this.blitMaterial.setProperty("blurDirection", new Vec4(0, 1, 0, 0));
        BlitPipeline.instance.blit(this._avgTempMap, this._avgMap, this.blitMaterial, 1);
        await this.delay();

        if (HFDS.useOriginalDiffuse) {
            this.material.setProperty("_MainTex", MainGui.instance._DiffuseMapOriginal);
        } else {
            this.material.setProperty("_MainTex", MainGui.instance._DiffuseMap);
        }

        this.material.setProperty("blurTex0", this._blurMap0);
        this.material.setProperty("blurTex1", this._blurMap1);
        this.material.setProperty("blurTex2", this._blurMap2);
        this.material.setProperty("blurTex3", this._blurMap3);
        this.material.setProperty("blurTex4", this._blurMap4);
        this.material.setProperty("blurTex5", this._blurMap5);
        this.material.setProperty("blurTex6", this._blurMap6);
        this.material.setProperty("avgTex", this._avgMap);

        await this.delay();

        this.busy = false;
    }

    async delay (time: number = 17) {
        await new Promise<void>((resolve, reject) => {
            setTimeout(() => {
                resolve();
            }, time);
        })
    }

    buildGui () {
        GuiHelper.instance.clean();

        GuiHelper.instance.toggle("useAdjustedDiffuse", HFDS.useAdjustedDiffuse, (value) => {
            HFDS.useAdjustedDiffuse = value;
            if (HFDS.useAdjustedDiffuse) {
                HFDS.useOriginalDiffuse = false;
                HFDS.useNormal = false;
            }
            else if (!HFDS.useOriginalDiffuse && !HFDS.useNormal) {
                HFDS.useAdjustedDiffuse = true;
            }
        });

        GuiHelper.instance.toggle("useAdjustedDiffuse", HFDS.useAdjustedDiffuse, (value) => {
            HFDS.useAdjustedDiffuse = value;

            if (HFDS.useAdjustedDiffuse) {
                HFDS.useOriginalDiffuse = false;
                HFDS.useNormal = false;
            }
            else if (!HFDS.useOriginalDiffuse && !HFDS.useNormal) {
                HFDS.useAdjustedDiffuse = true;
            }
        });

        GuiHelper.instance.toggle("useOriginalDiffuse", HFDS.useOriginalDiffuse, (value) => {
            HFDS.useOriginalDiffuse = value;

            if (HFDS.useOriginalDiffuse) {
                HFDS.useAdjustedDiffuse = false;
                HFDS.useNormal = false;
            }
            else if (!HFDS.useAdjustedDiffuse && !HFDS.useNormal) {
                HFDS.useOriginalDiffuse = true;
            }
        });
        GuiHelper.instance.toggle("useNormal", HFDS.useNormal, (value) => {
            HFDS.useNormal = value;

            if (HFDS.useNormal) {
                HFDS.useAdjustedDiffuse = false;
                HFDS.useOriginalDiffuse = false;
            }
            else if (!HFDS.useAdjustedDiffuse && !HFDS.useOriginalDiffuse) {
                HFDS.useNormal = true;
            }
        });

        GuiHelper.instance.slider("slider", this._slider, 0, 1, (value) => {
            this._slider = value;
        });

        if (HFDS.useNormal) {
            GuiHelper.instance.slider("Sample Spread", HFDS.spread, 10, 200, (value) => {
                HFDS.spread = value;
                this.doStuff = true;
            });
            GuiHelper.instance.slider("Sample Spread Boost", HFDS.spreadBoost, 1, 5, (value) => {
                HFDS.spreadBoost = value;
                this.doStuff = true;
            });
        } else {
            GuiHelper.instance.button("Default", () => {
                // SetWeightEQDefault();
            });

            GuiHelper.instance.button("Details", () => {
                // SetWeightEQDetail();
            });
            GuiHelper.instance.button("Displace", () => {
                // SetWeightEQDisplace();
            });

            GuiHelper.instance.slider("Blur0Weight", HFDS.blur0Weight, 0, 1, (value) => { HFDS.blur0Weight = value });
            GuiHelper.instance.slider("Blur1Weight", HFDS.blur1Weight, 0, 1, (value) => { HFDS.blur1Weight = value });
            GuiHelper.instance.slider("Blur2Weight", HFDS.blur2Weight, 0, 1, (value) => { HFDS.blur2Weight = value });
            GuiHelper.instance.slider("Blur3Weight", HFDS.blur3Weight, 0, 1, (value) => { HFDS.blur3Weight = value });
            GuiHelper.instance.slider("Blur4Weight", HFDS.blur4Weight, 0, 1, (value) => { HFDS.blur4Weight = value });
            GuiHelper.instance.slider("Blur5Weight", HFDS.blur5Weight, 0, 1, (value) => { HFDS.blur5Weight = value });
            GuiHelper.instance.slider("Blur6Weight", HFDS.blur6Weight, 0, 1, (value) => { HFDS.blur6Weight = value });

            GuiHelper.instance.button("ContrastEQDefault", () => {
                // SetContrastEQDefault();
            });

            GuiHelper.instance.button("ContrastEQCrackedMud", () => {
                // SetContrastEQCrackedMud();
            });
            GuiHelper.instance.button("ContrastEQFunky", () => {
                // ContrastEQFunky();
            });


            GuiHelper.instance.slider("Blur0Contrast", HFDS.blur0Contrast, -5, 5, (value) => { HFDS.blur0Contrast = value });
            GuiHelper.instance.slider("Blur1Contrast", HFDS.blur1Contrast, -5, 5, (value) => { HFDS.blur1Contrast = value });
            GuiHelper.instance.slider("Blur2Contrast", HFDS.blur2Contrast, -5, 5, (value) => { HFDS.blur2Contrast = value });
            GuiHelper.instance.slider("Blur3Contrast", HFDS.blur3Contrast, -5, 5, (value) => { HFDS.blur3Contrast = value });
            GuiHelper.instance.slider("Blur4Contrast", HFDS.blur4Contrast, -5, 5, (value) => { HFDS.blur4Contrast = value });
            GuiHelper.instance.slider("Blur5Contrast", HFDS.blur5Contrast, -5, 5, (value) => { HFDS.blur5Contrast = value });
            GuiHelper.instance.slider("Blur6Contrast", HFDS.blur6Contrast, -5, 5, (value) => { HFDS.blur6Contrast = value });

            // GuiHelper.instance.toggle("Use Color Sample 1", HFDS.useSample1, (value) => {
            //     HFDS.useSample1 = value;
            //     this.doStuff = true;
            // });

            // if (HFDS.useSample1) {
            //     GuiHelper.instance.toggle("Isolate Mask", HFDS.isolateSample1, (value) => {
            //         HFDS.isolateSample1 = value;
            //         this.doStuff = true;
            //         if (HFDS.isolateSample1) {
            //             HFDS.isolateSample2 = false;
            //         }
            //     });
            // }

        }

        GuiHelper.instance.slider("Final Gain", HFDS.finalGain, -0.5, 0.5, (value) => {
            HFDS.finalGain = value;
        });
        GuiHelper.instance.slider("Final Contrast", HFDS.finalContrast, -10, 10, (value) => {
            HFDS.finalContrast = value;
        });

        GuiHelper.instance.slider("Final Bias", HFDS.finalBias, -1, 1, (value) => {
            HFDS.finalBias = value;
        });

        GuiHelper.instance.button("Set as Height Map", () => {
            this.processHeight()
        });


        GuiHelper.instance.reSize();
    }

    update (dt: number): void {
        // if (this.selectingColor) {
        //     this.selectColor(); // 需要做调色盘一样的功能来让用户选择颜色？
        // }

        if (HFDS.useAdjustedDiffuse != this.lastUseDiffuse) {
            this.lastUseDiffuse = HFDS.useAdjustedDiffuse;
            this.doStuff = true;
        }
        if (HFDS.useOriginalDiffuse != this.lastUseOriginalDiffuse) {
            this.lastUseOriginalDiffuse = HFDS.useOriginalDiffuse;
            this.doStuff = true;
        }

        if (HFDS.useNormal != this.lastUseNormal) {
            this.lastUseNormal = HFDS.useNormal;
            this.doStuff = true;
        }

        if (HFDS.blur0Contrast != this.lastBlur0Contrast) {
            this.lastBlur0Contrast = HFDS.blur0Contrast;
            this.doStuff = true;
        }



        if (this.newTexture) {
            this.initializeTextures();
            this.newTexture = false;
        }

        this.process();


    }



    async process () {
        if (this.doStuff) {
            if (HFDS.useNormal) {
                await this.processNormal();
            }
            else {
                await this.processDiffuse();
            }

            this.doStuff = false;
        }

        if (HFDS.isolateSample1 || HFDS.isolateSample2) {
            this.material.setProperty("isolate", 1);
        } else {
            this.material.setProperty("isolate", 0);
        }

        this.material.setProperty("blur0Weight", HFDS.blur0Weight);
        this.material.setProperty("blur1Weight", HFDS.blur1Weight);
        this.material.setProperty("blur2Weight", HFDS.blur2Weight);
        this.material.setProperty("blur3Weight", HFDS.blur3Weight);
        this.material.setProperty("blur4Weight", HFDS.blur4Weight);
        this.material.setProperty("blur5Weight", HFDS.blur5Weight);
        this.material.setProperty("blur6Weight", HFDS.blur6Weight);

        this.material.setProperty("blur0Contrast", HFDS.blur0Contrast);
        this.material.setProperty("blur1Contrast", HFDS.blur1Contrast);
        this.material.setProperty("blur2Contrast", HFDS.blur2Contrast);
        this.material.setProperty("blur3Contrast", HFDS.blur3Contrast);
        this.material.setProperty("blur4Contrast", HFDS.blur4Contrast);
        this.material.setProperty("blur5Contrast", HFDS.blur5Contrast);
        this.material.setProperty("blur6Contrast", HFDS.blur6Contrast);

        let realGain = HFDS.finalGain;
        if (realGain < 0.0) {
            realGain = Math.abs(1.0 / (realGain - 1.0));
        } else {
            realGain = realGain + 1.0;
        }

        this.material.setProperty("finalGain", realGain);
        this.material.setProperty("finalContrast", HFDS.finalContrast);
        this.material.setProperty("finalBias", HFDS.finalBias);

        this.material.setProperty("slider", this._slider);
    }
}
