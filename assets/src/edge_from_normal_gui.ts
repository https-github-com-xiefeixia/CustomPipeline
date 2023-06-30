import { _decorator, Color, Component, Material, Mesh, MeshRenderer, Node, Rect, gfx, RenderTexture, settings, Texture2D, Vec2, Vec4, math } from 'cc';
import { BlitPipeline } from './Pipeline';
import { MainGui } from './main_gui';
const { ccclass, property } = _decorator;

class EdgeSettings {
    public Blur0Contrast: number = 1.0;
    public Blur0Weight: number = 1.0;
    public Blur1Weight: number = 0.5;
    public Blur2Weight: number = 0.3;
    public Blur3Weight: number = 0.5;
    public Blur4Weight: number = 0.7;
    public Blur5Weight: number = 0.7;
    public Blur6Weight: number = 0.3;
    public FinalContrast: number = 1.0;
    public FinalBias: number = 0.0;
    public EdgeAmount: number = 1.0;
    public CreviceAmount: number = 1.0;
    public Pinch: number = 1.0;
    public Pillow: number = 1.0;
}

const ES = new EdgeSettings();

@ccclass('EdgeFromNormalGui')
export class EdgeFromNormalGui extends Component {
    @property(Node)
    testObject: Node;

    _edgeMap: Texture2D;
    _normalMap: Texture2D;
    _tempBlurMap: RenderTexture;
    _blurMap0: RenderTexture;
    _blurMap1: RenderTexture;
    _blurMap2: RenderTexture;
    _blurMap3: RenderTexture;
    _blurMap4: RenderTexture;
    _blurMap5: RenderTexture;
    _blurMap6: RenderTexture;
    _tempEdgeMap: RenderTexture;

    imageSizeX: number = 1024;
    imageSizeY: number = 1024;

    public material: Material;
    public blitMaterial: Material;

    doStuff: boolean = false;
    newTexture: boolean = false;

    windowRect: Rect = new Rect(30, 300, 300, 600);

    settingsInitialized: boolean = false;

    public busy: boolean = false;


    initializeSettings () {
        if (this.settingsInitialized == false) {
            console.log("Initializing Edge Settings");
            this.settingsInitialized = true;
        }
    }

    start () {
        this.testObject.getComponent(MeshRenderer).material = this.material;

        this.blitMaterial = new Material();
        this.blitMaterial.initialize({
            effectName: "blit_shader",
        });
        this.initializeSettings();
    }

    update () {

        if (this.newTexture) {
            this.initializeTextures();
            this.newTexture = false;
        }

    }


    async updateMaterial () {
        if (this.doStuff) {
            this.processNormal();
            this.doStuff = false;
        }

        this.material.setProperty("blur0Weight", ES.Blur0Weight * ES.Blur0Weight * ES.Blur0Weight);
        this.material.setProperty("blur1Weight", ES.Blur1Weight * ES.Blur1Weight * ES.Blur1Weight);
        this.material.setProperty("blur2Weight", ES.Blur2Weight * ES.Blur2Weight * ES.Blur2Weight);
        this.material.setProperty("blur3Weight", ES.Blur3Weight * ES.Blur3Weight * ES.Blur3Weight);
        this.material.setProperty("blur4Weight", ES.Blur4Weight * ES.Blur4Weight * ES.Blur4Weight);
        this.material.setProperty("blur5Weight", ES.Blur5Weight * ES.Blur5Weight * ES.Blur5Weight);
        this.material.setProperty("blur6Weight", ES.Blur6Weight * ES.Blur6Weight * ES.Blur6Weight);
        this.material.setProperty("_EdgeAmount", ES.EdgeAmount);
        this.material.setProperty("_CreviceAmount", ES.CreviceAmount);
        this.material.setProperty("_Pinch", ES.Pinch);
        this.material.setProperty("_Pillow", ES.Pillow);
        this.material.setProperty("_FinalContrast", ES.FinalContrast);
        this.material.setProperty("_FinalBias", ES.FinalBias);
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

    initializeTextures () {
        this.testObject.getComponent(MeshRenderer).material = this.material;


        this._normalMap = MainGui.instance._NormalMap;

        this.imageSizeX = this._normalMap.width;
        this.imageSizeY = this._normalMap.height;

        console.log("Initializing Textures of size: " + this.imageSizeX + "x" + this.imageSizeY);


        this._tempBlurMap = this.initializeTexture();
        this._blurMap0 = this.initializeTexture();
        this._blurMap1 = this.initializeTexture();
        this._blurMap2 = this.initializeTexture();
        this._blurMap3 = this.initializeTexture();
        this._blurMap4 = this.initializeTexture();
        this._blurMap5 = this.initializeTexture();
        this._blurMap6 = this.initializeTexture();
    }
    public async ProcessEdge () {

        this.busy = true;

        console.log("Processing Height / Edge");

        this.blitMaterial.setProperty("_ImageSize", new Vec4(this.imageSizeX, this.imageSizeY, 0, 0));

        this.blitMaterial.setProperty("blur0Weight", ES.Blur0Weight * ES.Blur0Weight * ES.Blur0Weight);
        this.blitMaterial.setProperty("blur1Weight", ES.Blur1Weight * ES.Blur1Weight * ES.Blur1Weight);
        this.blitMaterial.setProperty("blur2Weight", ES.Blur2Weight * ES.Blur2Weight * ES.Blur2Weight);
        this.blitMaterial.setProperty("blur3Weight", ES.Blur3Weight * ES.Blur3Weight * ES.Blur3Weight);
        this.blitMaterial.setProperty("blur4Weight", ES.Blur4Weight * ES.Blur4Weight * ES.Blur4Weight);
        this.blitMaterial.setProperty("blur5Weight", ES.Blur5Weight * ES.Blur5Weight * ES.Blur5Weight);
        this.blitMaterial.setProperty("blur6Weight", ES.Blur6Weight * ES.Blur6Weight * ES.Blur6Weight);
        this.blitMaterial.setProperty("edgeAmount", ES.EdgeAmount);
        this.blitMaterial.setProperty("creviceAmount", ES.CreviceAmount);
        this.blitMaterial.setProperty("pinch", ES.Pinch);
        this.blitMaterial.setProperty("pillow", ES.Pillow);
        this.blitMaterial.setProperty("finalContrast", ES.FinalContrast);
        this.blitMaterial.setProperty("finalBias", ES.FinalBias);

        this.blitMaterial.setProperty("mainTex", this._normalMap);
        this.blitMaterial.setProperty("blurTex0", this._blurMap0);
        this.blitMaterial.setProperty("blurTex1", this._blurMap1);
        this.blitMaterial.setProperty("blurTex2", this._blurMap2);
        this.blitMaterial.setProperty("blurTex3", this._blurMap3);
        this.blitMaterial.setProperty("blurTex4", this._blurMap4);
        this.blitMaterial.setProperty("blurTex5", this._blurMap5);
        this.blitMaterial.setProperty("blurTex6", this._blurMap6);

        // Save low fidelity for texture 2d

        // CleanupTexture(_TempEdgeMap);
        // _TempEdgeMap = new RenderTexture(imageSizeX, imageSizeY, 0, RenderTextureFormat.ARGB32, RenderTextureReadWrite.Linear);
        // _TempEdgeMap.wrapMode = TextureWrapMode.Repeat;
        // Graphics.Blit(_BlurMap0, _TempEdgeMap, this.blitMaterial, 6);

        // RenderTexture.active = _TempEdgeMap;

        // if (MainGui.instance._EdgeMap != null) {
        //     Destroy(MainGui.instance._EdgeMap);
        // }

        // MainGui.instance._EdgeMap = new Texture2D(_TempEdgeMap.width, _TempEdgeMap.height, TextureFormat.ARGB32, true, true);
        // MainGui.instance._EdgeMap.ReadPixels(new Rect(0, 0, _TempEdgeMap.width, _TempEdgeMap.height), 0, 0);
        // MainGui.instance._EdgeMap.Apply();

        // yield return new WaitForSeconds(0.1f);

        // CleanupTexture(_TempEdgeMap);

        this.busy = false;

    }

    public async processNormal () {

        this.busy = true;

        console.log("Processing Normal to Edge");

        this.blitMaterial.setProperty("imageSize", new Vec4(this.imageSizeX, this.imageSizeY, 0, 0));

        // Make normal from height
        this.blitMaterial.setProperty("blurContrast", ES.Blur0Contrast);
        this.blitMaterial.setProperty("mainTex", this._normalMap);
        BlitPipeline.instance.blit(this._normalMap, this._blurMap0, this.blitMaterial, 5);
        await this.delay();


        this.blitMaterial.setProperty("blurContrast", 1.0);

        // Blur the image 1
        this.blitMaterial.setProperty("mainTex", this._blurMap0);
        this.blitMaterial.setProperty("blurSamples", 4);
        this.blitMaterial.setProperty("blurSpread", 1.0);
        this.blitMaterial.setProperty("blurDirection", new Vec4(1, 0, 0, 0));
        BlitPipeline.instance.blit(this._blurMap0, this._tempBlurMap, this.blitMaterial, 1);
        await this.delay();

        this.blitMaterial.setProperty("mainTex", this._tempBlurMap);
        this.blitMaterial.setProperty("blurDirection", new Vec4(0, 1, 0, 0));
        BlitPipeline.instance.blit(this._tempBlurMap, this._blurMap1, this.blitMaterial, 1);
        await this.delay();


        // Blur the image 2
        this.blitMaterial.setProperty("mainTex", this._blurMap1);
        this.blitMaterial.setProperty("blurSpread", 2.0);
        this.blitMaterial.setProperty("blurDirection", new Vec4(1, 0, 0, 0));
        BlitPipeline.instance.blit(this._blurMap1, this._tempBlurMap, this.blitMaterial, 1);
        await this.delay();

        this.blitMaterial.setProperty("mainTex", this._tempBlurMap);
        this.blitMaterial.setProperty("blurDirection", new Vec4(0, 1, 0, 0));
        BlitPipeline.instance.blit(this._tempBlurMap, this._blurMap2, this.blitMaterial, 1);
        await this.delay();

        // Blur the image 3
        this.blitMaterial.setProperty("mainTex", this._blurMap2);
        this.blitMaterial.setProperty("blurSpread", 4.0);
        this.blitMaterial.setProperty("blurDirection", new Vec4(1, 0, 0, 0));
        BlitPipeline.instance.blit(this._blurMap2, this._tempBlurMap, this.blitMaterial, 1);
        await this.delay();

        this.blitMaterial.setProperty("mainTex", this._tempBlurMap);
        this.blitMaterial.setProperty("blurDirection", new Vec4(0, 1, 0, 0));
        BlitPipeline.instance.blit(this._tempBlurMap, this._blurMap3, this.blitMaterial, 1);
        await this.delay();

        // Blur the image 4
        this.blitMaterial.setProperty("mainTex", this._blurMap3);
        this.blitMaterial.setProperty("blurSpread", 8.0);
        this.blitMaterial.setProperty("blurDirection", new Vec4(1, 0, 0, 0));
        BlitPipeline.instance.blit(this._blurMap3, this._tempBlurMap, this.blitMaterial, 1);
        await this.delay();

        this.blitMaterial.setProperty("mainTex", this._tempBlurMap);
        this.blitMaterial.setProperty("blurDirection", new Vec4(0, 1, 0, 0));
        BlitPipeline.instance.blit(this._tempBlurMap, this._blurMap4, this.blitMaterial, 1);
        await this.delay();


        // Blur the image 5
        this.blitMaterial.setProperty("mainTex", this._blurMap4);
        this.blitMaterial.setProperty("blurSpread", 16.0);
        this.blitMaterial.setProperty("blurDirection", new Vec4(1, 0, 0, 0));
        BlitPipeline.instance.blit(this._blurMap4, this._tempBlurMap, this.blitMaterial, 1);
        await this.delay();

        this.blitMaterial.setProperty("mainTex", this._tempBlurMap);
        this.blitMaterial.setProperty("blurDirection", new Vec4(0, 1, 0, 0));
        BlitPipeline.instance.blit(this._tempBlurMap, this._blurMap5, this.blitMaterial, 1);
        await this.delay();



        // Blur the image 6
        this.blitMaterial.setProperty("mainTex", this._blurMap5);
        this.blitMaterial.setProperty("blurSpread", 32.0);
        this.blitMaterial.setProperty("blurDirection", new Vec4(1, 0, 0, 0));
        BlitPipeline.instance.blit(this._blurMap5, this._tempBlurMap, this.blitMaterial, 1);
        await this.delay();

        this.blitMaterial.setProperty("mainTex", this._tempBlurMap);
        this.blitMaterial.setProperty("blurDirection", new Vec4(0, 1, 0, 0));
        BlitPipeline.instance.blit(this._tempBlurMap, this._blurMap6, this.blitMaterial, 1);
        await this.delay();


        this.material.setProperty("mainTex", this._blurMap0);
        this.material.setProperty("blurTex0", this._blurMap0);
        this.material.setProperty("blurTex1", this._blurMap1);
        this.material.setProperty("blurTex2", this._blurMap2);
        this.material.setProperty("blurTex3", this._blurMap3);
        this.material.setProperty("blurTex4", this._blurMap4);
        this.material.setProperty("blurTex5", this._blurMap5);
        this.material.setProperty("blurTex6", this._blurMap6);

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

}