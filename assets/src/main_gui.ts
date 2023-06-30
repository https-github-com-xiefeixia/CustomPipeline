import { _decorator, Camera, Component, Material, Node, RenderTexture, Texture2D, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('MainGui')
export class MainGui extends Component {

    @property(Node)
    heightFromDiffuseguiObject: Node;
    @property(Node)
    normalFromHeightGuiObject: Node;
    @property(Node)
    edgeFromNormalGuiObject: Node;
    @property(Node)
    aoFromNormalGuiObject: Node;
    @property(Node)
    editDiffuseGuiObject: Node;
    @property(Node)
    metallicGuiObject: Node;
    @property(Node)
    smoothnessGuiObject: Node;
    @property(Node)
    materialGuiObject: Node;
    @property(Node)
    postProcessGuiObject: Node;
    @property(Node)
    tilingTextureMakerGuiObject: Node;
    @property(Node)
    suggestionGuiObject: Node;
    @property(Node)
    saveLoadProjectObject: Node;
    @property(Node)
    commandListExecutorObject: Node;
    @property(Node)
    settingsGuiObject: Node;



    public _TextureBlack: RenderTexture;
    public _TextureWhite: RenderTexture;
    public _TextureGrey: RenderTexture;
    public _TextureNormal: RenderTexture;

    public _HDHeightMap: RenderTexture;
    public _HeightMap: RenderTexture;
    public _DiffuseMap: RenderTexture;
    public _DiffuseMapOriginal: RenderTexture;
    public _NormalMap: RenderTexture;
    public _MetallicMap: RenderTexture;
    public _SmoothnessMap: RenderTexture;
    public _EdgeMap: RenderTexture;
    public _AOMap: RenderTexture;

    public _PropertyMap: RenderTexture;

    public FullMaterialRef: Material;
    public FullMaterial: Material;
    public SampleMaterialRef: Material;
    public SampleMaterial: Material;

    public testObject: Node;
    public testObjectCube: Node;
    public testObjectCylinder: Node;
    public testObjectSphere: Node;

    //public  skyboxMaterial: Material;
    //  public ReflectionProbe reflectionProbe; 
    //  public Cubemap[] CubeMaps;
    public selectedCubemap: number = 0;

    material: Material;

    _Falloff: number = 0.1;
    _OverlapX: number = 0.2;
    _OverlapY: number = 0.2;
    _SmoothBlend: boolean = false;
    _GamaCorrection: number = 2.2;

    busySaving: boolean = false;

    //  public FileFormat selectedFormat = FileFormat.tga;
    bmpSelected: boolean = true;
    jpgSelected: boolean = false;
    pngSelected: boolean = true;
    tgaSelected: boolean = false;
    tiffSelected: boolean = false;

    public hideGui: boolean = false;
    public camera: Camera;
    CameraTargetPos: Vec3 = Vec3.ZERO;
    CameraOffsetPos: Vec3 = Vec3.ZERO;

    clearTextures: boolean = false;

    objectsToUnhide: Node[] = [];

    // public FileBrowser fileBrowser; ??
    // Shader PropertyCompShader;??
    PropertyCompMaterial: Material;

    public QuicksavePath: string = "";
    public QuicksavePathHeight: string = "";
    public QuicksavePathDiffuse: string = "";
    public QuicksavePathNormal: string = "";
    public QuicksavePathMetallic: string = "";
    public QuicksavePathSmoothness: string = "";
    public QuicksavePathEdge: string = "";
    public QuicksavePathAO: string = "";
    public QuicksavePathProperty: string = "";

    // public PropChannelMap propRed = PropChannelMap.None;
    // public PropChannelMap propGreen = PropChannelMap.None;
    // public PropChannelMap propBlue = PropChannelMap.None;
    propRedChoose: boolean = false;
    propGreenChoose: boolean = false;
    propBlueChoose: boolean = false;

    public static instance: MainGui;
    start () {
        MainGui.instance = this;

        this._HeightMap = null;
        this._HDHeightMap = null;
        this._DiffuseMap = null;
        this._DiffuseMapOriginal = null;
        this._NormalMap = null;
        this._MetallicMap = null;
        this._SmoothnessMap = null;
        this._EdgeMap = null;
        this._AOMap = null;

    }

    update (deltaTime: number) {

    }
}

