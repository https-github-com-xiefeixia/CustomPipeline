import { _decorator, rendering, renderer, game, Game, gfx, Material, resources, Camera, settings, find, Node, director, RenderTexture, pipeline, Texture2D, sys } from 'cc';
import { EDITOR, JSB } from 'cc/env';
import {
    AntiAliasing,
    buildForwardPass, buildBloomPasses, buildFxaaPass, buildPostprocessPass, buildUIPass,
    buildNativeForwardPass,
    isUICamera, decideProfilerCamera, getRenderArea, getLoadOpOfClearFlag, getClearFlags
} from './PassUtils';
const { ccclass, property } = _decorator;

let sub0Mat: Material = null;
let sub1Mat: Material = null;
let sub2Mat: Material = null;
let blitMat: Material = null;

resources.load('custom-sub0', Material, (error, material) => {
    sub0Mat = material;
});

resources.load('custom-sub1', Material, (error, material) => {
    sub1Mat = material;
});

resources.load('custom-sub2', Material, (error, material) => {
    sub2Mat = material;
});

resources.load('blitMat', Material, (error, material) => {
    blitMat = material;
});

// resources.load('materials/material', Material, (error, material) => {
//     blitMat = material;
// });

function addOrUpdateRenderTarget (name: string, format: gfx.Format, width: number, height: number, residency: rendering.ResourceResidency, pipeline: rendering.Pipeline) {

    if (!pipeline.containsResource(name)) {
        pipeline.addRenderTarget(name, format, width, height, residency);
    } else {
        pipeline.updateRenderTarget(name, width, height);
    }
}

export function getMaterial (path: string) {
    let mat = new Material();
    mat.initialize({
        effectName: path,
    });
    for (let i = 0; i < mat.passes.length; ++i) {
        mat.passes[i].tryCompile();
    }
    return mat;
}

export function buildProgrammableBlendPass (camera: renderer.scene.Camera, pipeline: rendering.Pipeline) {
    const area = getRenderArea(camera, camera.window.width, camera.window.height);
    const width = area.width;
    const height = area.height;

    addOrUpdateRenderTarget("c0", gfx.Format.RGBA8, width, height, rendering.ResourceResidency.MEMORYLESS, pipeline);
    addOrUpdateRenderTarget("c1", gfx.Format.RGBA8, width, height, rendering.ResourceResidency.MEMORYLESS, pipeline);
    addOrUpdateRenderTarget("c2", gfx.Format.RGBA8, width, height, rendering.ResourceResidency.MEMORYLESS, pipeline);
    addOrUpdateRenderTarget("c3", gfx.Format.RGBA8, width, height, rendering.ResourceResidency.MEMORYLESS, pipeline);
    addOrUpdateRenderTarget("c4", gfx.Format.RGBA8, width, height, rendering.ResourceResidency.MANAGED, pipeline);
    // addOrUpdateRenderTarget("ds", gfx.Format.DEPTH, width, height, rendering.ResourceResidency.MEMORYLESS, pipeline);

    const clearColor = new gfx.Color(0, 0, 0, 0);
    const builder = pipeline.addRenderPass(width, height, 'default');
    const subpass0 = builder.addRenderSubpass('custom-sub0');
    subpass0.addRenderTarget("c0", rendering.AccessType.WRITE, "_", gfx.LoadOp.CLEAR, gfx.StoreOp.DISCARD, clearColor);
    subpass0.addRenderTarget("c1", rendering.AccessType.WRITE, "_", gfx.LoadOp.CLEAR, gfx.StoreOp.DISCARD, clearColor);
    subpass0.addRenderTarget("c2", rendering.AccessType.WRITE, "_", gfx.LoadOp.CLEAR, gfx.StoreOp.DISCARD, clearColor);
    subpass0.addRenderTarget("c3", rendering.AccessType.WRITE, "_", gfx.LoadOp.CLEAR, gfx.StoreOp.DISCARD, clearColor);
    // subpass0.addDepthStencil("ds", rendering.AccessType.WRITE, "_", gfx.LoadOp.CLEAR, gfx.StoreOp.DISCARD);

    subpass0
        .addQueue(rendering.QueueHint.RENDER_OPAQUE)
        .addFullscreenQuad(sub0Mat, 0);

    const subpass1 = builder.addRenderSubpass('custom-sub1');
    subpass1.addRenderTarget("c0", rendering.AccessType.READ, "c0", gfx.LoadOp.DISCARD, gfx.StoreOp.DISCARD, clearColor);
    subpass1.addRenderTarget("c4", rendering.AccessType.WRITE, "color", gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, clearColor);
    subpass1.addRenderTarget("c1", rendering.AccessType.READ, "c1", gfx.LoadOp.DISCARD, gfx.StoreOp.DISCARD, clearColor);

    // subpass1.addDepthStencil("ds", rendering.AccessType.READ, "inds", gfx.LoadOp.DISCARD, gfx.StoreOp.DISCARD);

    subpass1
        .addQueue(rendering.QueueHint.RENDER_OPAQUE)
        .addFullscreenQuad(sub1Mat, 0);

    const subpass2 = builder.addRenderSubpass('custom-sub2');
    subpass2.addRenderTarget("c3", rendering.AccessType.READ, "c1", gfx.LoadOp.DISCARD, gfx.StoreOp.DISCARD, clearColor);
    subpass2.addRenderTarget("c4", rendering.AccessType.READ_WRITE, "color", gfx.LoadOp.DISCARD, gfx.StoreOp.STORE, clearColor);
    subpass2.addRenderTarget("c2", rendering.AccessType.READ, "c0", gfx.LoadOp.DISCARD, gfx.StoreOp.DISCARD, clearColor);
    // subpass2.addDepthStencil("ds", rendering.AccessType.READ, "inds", gfx.LoadOp.DISCARD, gfx.StoreOp.DISCARD);

    subpass2
        .addQueue(rendering.QueueHint.RENDER_OPAQUE)
        .addFullscreenQuad(sub2Mat, 0);

    // const layout = pipeline.device.createDescriptorSetLayout(new gfx.DescriptorSetLayoutInfo());

    // let setInfo = new gfx.DescriptorSetInfo();
    // setInfo.layout = layout;
    // const set = pipeline.device.createDescriptorSet(setInfo);
    // set.bindTexture(0, null, 0);
}

export function buildNativePipeline (cameras: renderer.scene.Camera[], pipeline: rendering.Pipeline) {
    buildProgrammableBlendPass(cameras[0], pipeline);
    buildNativeForwardPass(cameras[0], pipeline);
}

export function buildWebPipeline (cameras: renderer.scene.Camera[], pipeline: rendering.Pipeline) {
    decideProfilerCamera(cameras);
    const camera = cameras[0];
    const isGameView = camera.cameraUsage === renderer.scene.CameraUsage.GAME
        || camera.cameraUsage === renderer.scene.CameraUsage.GAME_VIEW;
    if (!isGameView) {
        // forward pass
        buildForwardPass(camera, pipeline, isGameView);
        return;
    }
    // TODO: The actual project is not so simple to determine whether the ui camera, here is just as a demo demonstration.
    if (!isUICamera(camera)) {
        // forward pass
        const forwardInfo = buildForwardPass(camera, pipeline, isGameView);
        // fxaa pass
        const fxaaInfo = buildFxaaPass(camera, pipeline, forwardInfo.rtName);
        // bloom passes
        const bloomInfo = buildBloomPasses(camera, pipeline, fxaaInfo.rtName);
        // Present Pass
        buildPostprocessPass(camera, pipeline, bloomInfo.rtName, AntiAliasing.NONE);
        return;
    }
    // render ui
    buildUIPass(camera, pipeline);
}

@ccclass('Pipeline')
export class TestCustomPipeline implements rendering.PipelineBuilder {
    setup (cameras: renderer.scene.Camera[], pipeline: rendering.Pipeline): void {
        if (!JSB) {
            buildWebPipeline(cameras, pipeline);
        } else {
            buildNativePipeline(cameras, pipeline);
        }
    }
}

export function builtBlitPass (camera: renderer.scene.Camera, pipeline: rendering.Pipeline, blitMat: Material, passId = 0, passName: string = 'output') {
    const area = getRenderArea(camera, camera.window.width, camera.window.height);
    const width = area.width;
    const height = area.height;

    if (!pipeline.containsResource(passName)) {
        pipeline.addRenderWindow(passName, gfx.Format.RGBA8, width, height, camera.window);
    } else {
        pipeline.updateRenderWindow(passName, camera.window);
    }

    const clearColor = new gfx.Color(0, 0, 0, 0);
    const builder = pipeline.addRenderPass(width, height, 'blit-custom');
    builder.addRenderTarget(passName, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, clearColor);
    builder.addQueue(rendering.QueueHint.NONE).addFullscreenQuad(blitMat, passId, rendering.SceneFlags.NONE);
}

@ccclass('Pipeline2')
export class TestBlitPipeline implements rendering.PipelineBuilder {
    setup (cameras: renderer.scene.Camera[], pipeline: rendering.Pipeline): void {
        decideProfilerCamera(cameras);
        const camera = cameras[0];
        const isGameView = camera.cameraUsage === renderer.scene.CameraUsage.GAME
            || camera.cameraUsage === renderer.scene.CameraUsage.GAME_VIEW;
        if (!isGameView) {
            // forward pass
            buildForwardPass(camera, pipeline, isGameView);
            return;
        }


        let blitCamera = null;
        let onScreenCamera = null;
        let uiCamera = null;
        for (let i = 0; i < cameras.length; ++i) {
            const camera = cameras[i];
            if (camera.name === 'Main Camera') {
                blitCamera = camera;
            }
            if (camera.name === 'Main Camera-002') {
                onScreenCamera = camera;
            }
            if (camera.name === "UICamera") {
                uiCamera = camera;
            }
        }

        // 通过渲染管线绘制到屏幕上
        builtBlitPass(blitCamera, pipeline, blitMat);

        if (uiCamera) {
            buildUIPass(uiCamera, pipeline);
        }

        // const onScreen = false;
        // let screenBuffer = null;

        // if (onScreen) {
        //     buildPostprocessPass(onScreenCamera, pipeline, "output", AntiAliasing.NONE);
        // } else {
        //     // 输出纹理数据
        //     const regions: gfx.BufferTextureCopy[] = [];
        //     const region0 = new gfx.BufferTextureCopy();
        //     region0.texOffset.x = 0;
        //     region0.texOffset.y = 0;
        //     region0.texExtent.width = blitCamera.window.width;
        //     region0.texExtent.height = blitCamera.window.height;
        //     regions.push(region0);

        //     const needSize = 4 * region0.texExtent.width * region0.texExtent.height;
        //     screenBuffer = new Uint8Array(needSize);

        //     const bufferViews: ArrayBufferView[] = [];
        //     bufferViews.push(screenBuffer);

        //     pipeline.device.copyTextureToBuffers(blitCamera.window.framebuffer.colorTextures[0], bufferViews, regions);
        // }
    }
}
@ccclass('Pipeline3')
export class BlitPipeline implements rendering.PipelineBuilder {
    private static _instance: BlitPipeline = null;
    public static get instance () {
        if (this._instance) {
            return this._instance;
        }

        this._instance = new BlitPipeline();
        return this._instance;
    }

    _cameras: Camera[] = [];
    _callList: Function[] = [];
    _blitMap: Map<Material, { camera: Camera, pass: number }> = new Map;
    _pipeline: rendering.Pipeline;

    mainMat: Material;

    _index: number = 0;

    setup (cameras: renderer.scene.Camera[], pipeline: rendering.Pipeline): void {
        this._pipeline = pipeline;

        decideProfilerCamera(cameras);
        const camera = cameras[0];
        const isGameView = camera.cameraUsage === renderer.scene.CameraUsage.GAME
            || camera.cameraUsage === renderer.scene.CameraUsage.GAME_VIEW;
        if (!isGameView) {
            // forward pass
            buildForwardPass(camera, pipeline, isGameView);
            return;
        }

        let blitCamera = null;
        let uiCamera = null;
        for (let i = 0; i < cameras.length; ++i) {
            const camera = cameras[i];
            if (camera.name === 'Main Camera') {
                blitCamera = camera;
            }
            if (camera.name === "UICamera") {
                uiCamera = camera;
            }
        }

        // 通过渲染管线绘制到屏幕上
        // if (!this.mainMat) {
        //     this.mainMat = blitMat;
        // }

        let delList = [];
        this._blitMap.forEach((info, mat) => {
            builtBlitPass(info.camera.camera, pipeline, mat, info.pass, "pass" + this._index++);
            info.camera.targetTexture = null;
            info.camera.enabled = false;
            this._cameras.push(info.camera);
        });

        delList.forEach((mat) => {
            this._blitMap.delete(mat);
        });


        if (this.mainMat) {
            builtBlitPass(blitCamera, pipeline, this.mainMat);
        }

        if (uiCamera) {
            buildUIPass(uiCamera, pipeline);
        }
    }

    // 暂时只能异步处理blit, 并返回纹理数据
    blit (srcTex: Texture2D | RenderTexture, tarTex: RenderTexture, mat: Material = null, pass = -1) {
        if (mat == null) {
            // let device = director.root!.device;
            // // 输出纹理数据
            // const regions: gfx.BufferTextureCopy[] = [];
            // const region0 = new gfx.BufferTextureCopy();
            // region0.texOffset.x = 0;
            // region0.texOffset.y = 0;
            // region0.texExtent.width = srcTex.width;
            // region0.texExtent.height = srcTex.height;
            // regions.push(region0);
            // let screenBuffer = null;
            // const needSize = 4 * region0.texExtent.width * region0.texExtent.height;
            // screenBuffer = new Uint8Array(needSize);
            // const bufferViews: ArrayBufferView[] = [];
            // bufferViews.push(screenBuffer);
            // device.copyTextureToBuffers(srcTex.getGFXTexture(), bufferViews, [new gfx.BufferTextureCopy(undefined, srcTex.height, undefined)]);
            // let region = new gfx.BufferTextureCopy(undefined, tarTex.height, undefined);
            // device.copyBuffersToTexture(bufferViews, tarTex.getGFXTexture(), [region]);

            // 可以默认一个材质，然后走同样的blit流程
        } else if (mat) {
            if (this._pipeline) {
                let camera: Camera = null;
                if (this._cameras.length > 0) {
                    camera = this._cameras.shift();
                    camera.targetTexture = tarTex;
                    camera.enabled = true;
                } else {
                    let cameraNode = new Node;
                    cameraNode.parent = director.getScene();
                    camera = cameraNode.addComponent(Camera);
                    camera.targetTexture = tarTex;
                }
                mat.setProperty("mainTex", srcTex);
                this._blitMap.set(mat, { camera, pass });
                //   builtBlitPass(camera, this._pipeline, mat, pass, "pass" + mat.name);

                // const regions: gfx.BufferTextureCopy[] = [];
                // const region0 = new gfx.BufferTextureCopy();
                // region0.texOffset.x = 0;
                // region0.texOffset.y = 0;
                // region0.texExtent.width = camera.window.width;
                // region0.texExtent.height = camera.window.height;
                // regions.push(region0);
                // let screenBuffer = null;
                // const needSize = 4 * region0.texExtent.width * region0.texExtent.height;
                // screenBuffer = new Uint8Array(needSize);

                // const bufferViews: ArrayBufferView[] = [];
                // bufferViews.push(screenBuffer);

                // this._pipeline.device.copyTextureToBuffers(camera.window.framebuffer.colorTextures[0], bufferViews, regions);

                // let device = director.root!.device;
                // device.copyBuffersToTexture(bufferViews, tarTex.getGFXTexture(), [new gfx.BufferTextureCopy(undefined, tarTex.height, undefined)]);
            }
        }
    } å
}


game.on(Game.EVENT_RENDERER_INITED, () => {
    // 初始化之后就会替换原来的管线
    if (JSB) {
        rendering.setCustomPipeline('CustomPipeline2', BlitPipeline.instance);
    }
    // rendering.setCustomPipeline('CustomPipeline2', new TestBlitPipeline);
});