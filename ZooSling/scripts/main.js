'use strict';
window.DOMHandler = class {
    constructor(f, a) {
        this._iRuntime = f;
        this._componentId = a;
        this._hasTickCallback = !1;
        this._tickCallback = ()=>this.Tick()
    }
    Attach() {}
    PostToRuntime(f, a, b, d) {
        this._iRuntime.PostToRuntimeComponent(this._componentId, f, a, b, d)
    }
    PostToRuntimeAsync(f, a, b, d) {
        return this._iRuntime.PostToRuntimeComponentAsync(this._componentId, f, a, b, d)
    }
    _PostToRuntimeMaybeSync(f, a, b) {
        this._iRuntime.UsesWorker() ? this.PostToRuntime(f, a, b) : this._iRuntime._GetLocalRuntime()._OnMessageFromDOM({
            type: "event",
            component: this._componentId,
            handler: f,
            dispatchOpts: b || null,
            data: a,
            responseId: null
        })
    }
    AddRuntimeMessageHandler(f, a) {
        this._iRuntime.AddRuntimeComponentMessageHandler(this._componentId, f, a)
    }
    AddRuntimeMessageHandlers(f) {
        for (const [a,b] of f)
            this.AddRuntimeMessageHandler(a, b)
    }
    GetRuntimeInterface() {
        return this._iRuntime
    }
    GetComponentID() {
        return this._componentId
    }
    _StartTicking() {
        this._hasTickCallback || (this._iRuntime._AddRAFCallback(this._tickCallback),
        this._hasTickCallback = !0)
    }
    _StopTicking() {
        this._hasTickCallback && (this._iRuntime._RemoveRAFCallback(this._tickCallback),
        this._hasTickCallback = !1)
    }
    Tick() {}
}
;
window.RateLimiter = class {
    constructor(f, a) {
        this._callback = f;
        this._interval = a;
        this._timerId = -1;
        this._lastCallTime = -Infinity;
        this._timerCallFunc = ()=>this._OnTimer();
        this._canRunImmediate = this._ignoreReset = !1
    }
    SetCanRunImmediate(f) {
        this._canRunImmediate = !!f
    }
    Call() {
        if (-1 === this._timerId) {
            var f = Date.now()
              , a = f - this._lastCallTime
              , b = this._interval;
            a >= b && this._canRunImmediate ? (this._lastCallTime = f,
            this._RunCallback()) : this._timerId = self.setTimeout(this._timerCallFunc, Math.max(b - a, 4))
        }
    }
    _RunCallback() {
        this._ignoreReset = !0;
        this._callback();
        this._ignoreReset = !1
    }
    Reset() {
        this._ignoreReset || (this._CancelTimer(),
        this._lastCallTime = Date.now())
    }
    _OnTimer() {
        this._timerId = -1;
        this._lastCallTime = Date.now();
        this._RunCallback()
    }
    _CancelTimer() {
        -1 !== this._timerId && (self.clearTimeout(this._timerId),
        this._timerId = -1)
    }
    Release() {
        this._CancelTimer();
        this._timerCallFunc = this._callback = null
    }
}
;
"use strict";
window.DOMElementHandler = class extends self.DOMHandler {
    constructor(f, a) {
        super(f, a);
        this._elementMap = new Map;
        this._autoAttach = !0;
        this.AddRuntimeMessageHandlers([["create", b=>this._OnCreate(b)], ["destroy", b=>this._OnDestroy(b)], ["set-visible", b=>this._OnSetVisible(b)], ["update-position", b=>this._OnUpdatePosition(b)], ["update-state", b=>this._OnUpdateState(b)], ["focus", b=>this._OnSetFocus(b)], ["set-css-style", b=>this._OnSetCssStyle(b)], ["set-attribute", b=>this._OnSetAttribute(b)], ["remove-attribute", b=>this._OnRemoveAttribute(b)]]);
        this.AddDOMElementMessageHandler("get-element", b=>b)
    }
    SetAutoAttach(f) {
        this._autoAttach = !!f
    }
    AddDOMElementMessageHandler(f, a) {
        this.AddRuntimeMessageHandler(f, b=>{
            const d = this._elementMap.get(b.elementId);
            return a(d, b)
        }
        )
    }
    _OnCreate(f) {
        const a = f.elementId
          , b = this.CreateElement(a, f);
        this._elementMap.set(a, b);
        f.isVisible || (b.style.display = "none");
        f = this._GetFocusElement(b);
        f.addEventListener("focus", d=>this._OnFocus(a));
        f.addEventListener("blur", d=>this._OnBlur(a));
        this._autoAttach && document.body.appendChild(b)
    }
    CreateElement(f, a) {
        throw Error("required override");
    }
    DestroyElement(f) {}
    _OnDestroy(f) {
        f = f.elementId;
        const a = this._elementMap.get(f);
        this.DestroyElement(a);
        this._autoAttach && a.parentElement.removeChild(a);
        this._elementMap.delete(f)
    }
    PostToRuntimeElement(f, a, b) {
        b || (b = {});
        b.elementId = a;
        this.PostToRuntime(f, b)
    }
    _PostToRuntimeElementMaybeSync(f, a, b) {
        b || (b = {});
        b.elementId = a;
        this._PostToRuntimeMaybeSync(f, b)
    }
    _OnSetVisible(f) {
        this._autoAttach && (this._elementMap.get(f.elementId).style.display = f.isVisible ? "" : "none")
    }
    _OnUpdatePosition(f) {
        if (this._autoAttach) {
            var a = this._elementMap.get(f.elementId);
            a.style.left = f.left + "px";
            a.style.top = f.top + "px";
            a.style.width = f.width + "px";
            a.style.height = f.height + "px";
            f = f.fontSize;
            null !== f && (a.style.fontSize = f + "em")
        }
    }
    _OnUpdateState(f) {
        const a = this._elementMap.get(f.elementId);
        this.UpdateState(a, f)
    }
    UpdateState(f, a) {
        throw Error("required override");
    }
    _GetFocusElement(f) {
        return f
    }
    _OnFocus(f) {
        this.PostToRuntimeElement("elem-focused", f)
    }
    _OnBlur(f) {
        this.PostToRuntimeElement("elem-blurred", f)
    }
    _OnSetFocus(f) {
        const a = this._GetFocusElement(this._elementMap.get(f.elementId));
        f.focus ? a.focus() : a.blur()
    }
    _OnSetCssStyle(f) {
        this._elementMap.get(f.elementId).style[f.prop] = f.val
    }
    _OnSetAttribute(f) {
        this._elementMap.get(f.elementId).setAttribute(f.name, f.val)
    }
    _OnRemoveAttribute(f) {
        this._elementMap.get(f.elementId).removeAttribute(f.name)
    }
    GetElementById(f) {
        return this._elementMap.get(f)
    }
}
;
"use strict";
{
    const f = /(iphone|ipod|ipad|macos|macintosh|mac os x)/i.test(navigator.userAgent);
    function a(u) {
        if (u.isStringSrc) {
            const g = document.createElement("script");
            g.async = !1;
            g.textContent = u.str;
            document.head.appendChild(g)
        } else
            return new Promise((g,k)=>{
                const c = document.createElement("script");
                c.onload = g;
                c.onerror = k;
                c.async = !1;
                c.src = u;
                document.head.appendChild(c)
            }
            )
    }
    let b = new Audio;
    const d = {
        "audio/webm; codecs=opus": !!b.canPlayType("audio/webm; codecs=opus"),
        "audio/ogg; codecs=opus": !!b.canPlayType("audio/ogg; codecs=opus"),
        "audio/webm; codecs=vorbis": !!b.canPlayType("audio/webm; codecs=vorbis"),
        "audio/ogg; codecs=vorbis": !!b.canPlayType("audio/ogg; codecs=vorbis"),
        "audio/mp4": !!b.canPlayType("audio/mp4"),
        "audio/mpeg": !!b.canPlayType("audio/mpeg")
    };
    b = null;
    async function h(u) {
        u = await m(u);
        return (new TextDecoder("utf-8")).decode(u)
    }
    function m(u) {
        return new Promise((g,k)=>{
            const c = new FileReader;
            c.onload = e=>g(e.target.result);
            c.onerror = e=>k(e);
            c.readAsArrayBuffer(u)
        }
        )
    }
    const q = [];
    let n = 0;
    window.RealFile = window.File;
    const t = []
      , v = new Map
      , w = new Map;
    let y = 0;
    const A = [];
    self.runOnStartup = function(u) {
        if ("function" !== typeof u)
            throw Error("runOnStartup called without a function");
        A.push(u)
    }
    ;
    const z = new Set(["cordova", "playable-ad", "instant-games"]);
    function B(u) {
        return z.has(u)
    }
    window.RuntimeInterface = class u {
        constructor(g) {
            this._useWorker = g.useWorker;
            this._messageChannelPort = null;
            this._baseUrl = "";
            this._scriptFolder = g.scriptFolder;
            this._workerScriptBlobURLs = {};
            this._loadingElem = this._localRuntime = this._worker = null;
            this._domHandlers = [];
            this._jobScheduler = this._canvas = this._runtimeDomHandler = null;
            this._rafId = -1;
            this._rafFunc = ()=>this._OnRAFCallback();
            this._rafCallbacks = [];
            this._exportType = g.exportType;
            !this._useWorker || "undefined" !== typeof OffscreenCanvas && navigator.userActivation || (this._useWorker = !1);
            B(this._exportType) && this._useWorker && (console.warn("[C3 runtime] Worker mode is enabled and supported, but is disabled in WebViews due to crbug.com/923007. Reverting to DOM mode."),
            this._useWorker = !1);
            this._localFileStrings = this._localFileBlobs = null;
            "html5" !== this._exportType && "playable-ad" !== this._exportType || "file" !== location.protocol.substr(0, 4) || alert("Exported games won't work until you upload them. (When running on the file: protocol, browsers block many features from working for security reasons.)");
            this.AddRuntimeComponentMessageHandler("runtime", "cordova-fetch-local-file", k=>this._OnCordovaFetchLocalFile(k));
            this.AddRuntimeComponentMessageHandler("runtime", "create-job-worker", k=>this._OnCreateJobWorker(k));
            "cordova" === this._exportType ? document.addEventListener("deviceready", ()=>this._Init(g)) : this._Init(g)
        }
        Release() {
            this._CancelAnimationFrame();
            this._messageChannelPort && (this._messageChannelPort = this._messageChannelPort.onmessage = null);
            this._worker && (this._worker.terminate(),
            this._worker = null);
            this._localRuntime && (this._localRuntime.Release(),
            this._localRuntime = null);
            this._canvas && (this._canvas.parentElement.removeChild(this._canvas),
            this._canvas = null)
        }
        GetCanvas() {
            return this._canvas
        }
        GetBaseURL() {
            // return this._baseUrl
            return "https://cdn.jsdelivr.net/gh/rojithpeiris1/assets@main/ZooSling/";
        }
        UsesWorker() {
            return this._useWorker
        }
        GetExportType() {
            return this._exportType
        }
        GetScriptFolder() {
            return this._scriptFolder
        }
        IsiOSCordova() {
            return f && "cordova" === this._exportType
        }
        IsiOSWebView() {
            return f && B(this._exportType) || navigator.standalone
        }
        async _Init(g) {
            "preview" === this._exportType && (this._loadingElem = document.createElement("div"),
            this._loadingElem.className = "previewLoadingMessage",
            this._loadingElem.textContent = g.previewLoadingMessage,
            document.body.appendChild(this._loadingElem));
            if ("playable-ad" === this._exportType) {
                this._localFileBlobs = self.c3_base64files;
                this._localFileStrings = {};
                await this._ConvertDataUrisToBlobs();
                for (let c = 0, e = g.engineScripts.length; c < e; ++c) {
                    var k = g.engineScripts[c].toLowerCase();
                    this._localFileStrings.hasOwnProperty(k) ? g.engineScripts[c] = {
                        isStringSrc: !0,
                        str: this._localFileStrings[k]
                    } : this._localFileBlobs.hasOwnProperty(k) && (g.engineScripts[c] = URL.createObjectURL(this._localFileBlobs[k]))
                }
            }
            g.baseUrl ? this._baseUrl = g.baseUrl : (k = location.origin,
            this._baseUrl = ("null" === k ? "file:///" : k) + location.pathname,
            k = this._baseUrl.lastIndexOf("/"),
            -1 !== k && (this._baseUrl = this._baseUrl.substr(0, k + 1)));
            if (g.workerScripts)
                for (const [c,e] of Object.entries(g.workerScripts))
                    this._workerScriptBlobURLs[c] = URL.createObjectURL(e);
            k = new MessageChannel;
            this._messageChannelPort = k.port1;
            this._messageChannelPort.onmessage = c=>this._OnMessageFromRuntime(c.data);
            window.c3_addPortMessageHandler && window.c3_addPortMessageHandler(c=>this._OnMessageFromDebugger(c));
            this._jobScheduler = new self.JobSchedulerDOM(this);
            await this._jobScheduler.Init();
            this.MaybeForceBodySize();
            "object" === typeof window.StatusBar && window.StatusBar.hide();
            "object" === typeof window.AndroidFullScreen && window.AndroidFullScreen.immersiveMode();
            this._useWorker ? await this._InitWorker(g, k.port2) : await this._InitDOM(g, k.port2)
        }
        _GetWorkerURL(g) {
            return this._workerScriptBlobURLs.hasOwnProperty(g) ? this._workerScriptBlobURLs[g] : g.endsWith("/workermain.js") && this._workerScriptBlobURLs.hasOwnProperty("workermain.js") ? this._workerScriptBlobURLs["workermain.js"] : "playable-ad" === this._exportType && this._localFileBlobs.hasOwnProperty(g.toLowerCase()) ? URL.createObjectURL(this._localFileBlobs[g.toLowerCase()]) : g
        }
        async CreateWorker(g, k, c) {
            if (g.startsWith("blob:"))
                return new Worker(g,c);
            if (this.IsiOSCordova() && "file:" === location.protocol)
                return g = await this.CordovaFetchLocalFileAsArrayBuffer(this._scriptFolder + g),
                g = new Blob([g],{
                    type: "application/javascript"
                }),
                new Worker(URL.createObjectURL(g),c);
            g = new URL(g,k);
            if (location.origin !== g.origin) {
                g = await fetch(g);
                if (!g.ok)
                    throw Error("failed to fetch worker script");
                g = await g.blob();
                return new Worker(URL.createObjectURL(g),c)
            }
            return new Worker(g,c)
        }
        _GetWindowInnerWidth() {
            return Math.max(window.innerWidth, 1)
        }
        _GetWindowInnerHeight() {
            return Math.max(window.innerHeight, 1)
        }
        MaybeForceBodySize() {
            if (this.IsiOSWebView()) {
                const g = document.documentElement.style
                  , k = document.body.style
                  , c = window.innerWidth < window.innerHeight
                  , e = c ? window.screen.width : window.screen.height;
                k.height = g.height = (c ? window.screen.height : window.screen.width) + "px";
                k.width = g.width = e + "px"
            }
        }
        _GetCommonRuntimeOptions(g) {
            return {
                baseUrl: this._baseUrl,
                windowInnerWidth: this._GetWindowInnerWidth(),
                windowInnerHeight: this._GetWindowInnerHeight(),
                devicePixelRatio: window.devicePixelRatio,
                isFullscreen: u.IsDocumentFullscreen(),
                projectData: g.projectData,
                previewImageBlobs: window.cr_previewImageBlobs || this._localFileBlobs,
                previewProjectFileBlobs: window.cr_previewProjectFileBlobs,
                exportType: g.exportType,
                isDebug: -1 < self.location.search.indexOf("debug"),
                ife: !!self.ife,
                jobScheduler: this._jobScheduler.GetPortData(),
                supportedAudioFormats: d,
                opusWasmScriptUrl: window.cr_opusWasmScriptUrl || this._scriptFolder + "opus.wasm.js",
                opusWasmBinaryUrl: window.cr_opusWasmBinaryUrl || this._scriptFolder + "opus.wasm.wasm",
                isiOSCordova: this.IsiOSCordova(),
                isiOSWebView: this.IsiOSWebView(),
                isFBInstantAvailable: "undefined" !== typeof self.FBInstant
            }
        }
        async _InitWorker(g, k) {
            var c = this._GetWorkerURL(g.workerMainUrl);
            this._worker = await this.CreateWorker(c, this._baseUrl, {
                name: "Runtime"
            });
            this._canvas = document.createElement("canvas");
            this._canvas.style.display = "none";
            c = this._canvas.transferControlToOffscreen();
            document.body.appendChild(this._canvas);
            window.c3canvas = this._canvas;
            this._worker.postMessage(Object.assign(this._GetCommonRuntimeOptions(g), {
                type: "init-runtime",
                isInWorker: !0,
                messagePort: k,
                canvas: c,
                workerDependencyScripts: g.workerDependencyScripts || [],
                engineScripts: g.engineScripts,
                projectScripts: window.cr_allProjectScripts,
                projectScriptsStatus: self.C3_ProjectScriptsStatus
            }), [k, c, ...this._jobScheduler.GetPortTransferables()]);
            this._domHandlers = t.map(e=>new e(this));
            this._FindRuntimeDOMHandler();
            self.c3_callFunction = (e,l)=>this._runtimeDomHandler._InvokeFunctionFromJS(e, l);
            "preview" === this._exportType && (self.goToLastErrorScript = ()=>this.PostToRuntimeComponent("runtime", "go-to-last-error-script"))
        }
        async _InitDOM(g, k) {
            this._canvas = document.createElement("canvas");
            this._canvas.style.display = "none";
            document.body.appendChild(this._canvas);
            window.c3canvas = this._canvas;
            this._domHandlers = t.map(e=>new e(this));
            this._FindRuntimeDOMHandler();
            const c = g.engineScripts.map(e=>"string" === typeof e ? (new URL(e,this._baseUrl)).toString() : e);
            Array.isArray(g.workerDependencyScripts) && c.unshift(...g.workerDependencyScripts);
            await Promise.all(c.map(e=>a(e)));
            if (g.projectScripts && 0 < g.projectScripts.length) {
                const e = self.C3_ProjectScriptsStatus;
                try {
                    if (await Promise.all(g.projectScripts.map(l=>a(l[1]))),
                    Object.values(e).some(l=>!l)) {
                        self.setTimeout(()=>this._ReportProjectScriptError(e), 100);
                        return
                    }
                } catch (l) {
                    console.error("[Preview] Error loading project scripts: ", l);
                    self.setTimeout(()=>this._ReportProjectScriptError(e), 100);
                    return
                }
            }
            "preview" === this._exportType && "object" !== typeof self.C3.ScriptsInEvents ? (this._RemoveLoadingMessage(),
            console.error("[C3 runtime] Failed to load JavaScript code used in events. Check all your JavaScript code has valid syntax."),
            alert("Failed to load JavaScript code used in events. Check all your JavaScript code has valid syntax.")) : (g = Object.assign(this._GetCommonRuntimeOptions(g), {
                isInWorker: !1,
                messagePort: k,
                canvas: this._canvas,
                runOnStartupFunctions: A
            }),
            this._OnBeforeCreateRuntime(),
            this._localRuntime = self.C3_CreateRuntime(g),
            await self.C3_InitRuntime(this._localRuntime, g))
        }
        _ReportProjectScriptError(g) {
            this._RemoveLoadingMessage();
            g = `Failed to load project script '${Object.entries(g).filter(k=>!k[1]).map(k=>k[0])[0]}'. Check all your JavaScript code has valid syntax.`;
            console.error("[Preview] " + g);
            alert(g)
        }
        _OnBeforeCreateRuntime() {
            this._RemoveLoadingMessage()
        }
        _RemoveLoadingMessage() {
            this._loadingElem && (this._loadingElem.parentElement.removeChild(this._loadingElem),
            this._loadingElem = null)
        }
        async _OnCreateJobWorker(g) {
            g = await this._jobScheduler._CreateJobWorker();
            return {
                outputPort: g,
                transferables: [g]
            }
        }
        _GetLocalRuntime() {
            if (this._useWorker)
                throw Error("not available in worker mode");
            return this._localRuntime
        }
        PostToRuntimeComponent(g, k, c, e, l) {
            this._messageChannelPort.postMessage({
                type: "event",
                component: g,
                handler: k,
                dispatchOpts: e || null,
                data: c,
                responseId: null
            }, l)
        }
        PostToRuntimeComponentAsync(g, k, c, e, l) {
            const p = y++
              , r = new Promise((x,C)=>{
                w.set(p, {
                    resolve: x,
                    reject: C
                })
            }
            );
            this._messageChannelPort.postMessage({
                type: "event",
                component: g,
                handler: k,
                dispatchOpts: e || null,
                data: c,
                responseId: p
            }, l);
            return r
        }
        ["_OnMessageFromRuntime"](g) {
            const k = g.type;
            if ("event" === k)
                return this._OnEventFromRuntime(g);
            if ("result" === k)
                this._OnResultFromRuntime(g);
            else if ("runtime-ready" === k)
                this._OnRuntimeReady();
            else if ("alert-error" === k)
                this._RemoveLoadingMessage(),
                alert(g.message);
            else if ("creating-runtime" === k)
                this._OnBeforeCreateRuntime();
            else
                throw Error(`unknown message '${k}'`);
        }
        _OnEventFromRuntime(g) {
            const k = g.component
              , c = g.handler
              , e = g.data
              , l = g.responseId;
            if (g = v.get(k))
                if (g = g.get(c)) {
                    var p = null;
                    try {
                        p = g(e)
                    } catch (r) {
                        console.error(`Exception in '${k}' handler '${c}':`, r);
                        null !== l && this._PostResultToRuntime(l, !1, "" + r);
                        return
                    }
                    if (null === l)
                        return p;
                    p && p.then ? p.then(r=>this._PostResultToRuntime(l, !0, r)).catch(r=>{
                        console.error(`Rejection from '${k}' handler '${c}':`, r);
                        this._PostResultToRuntime(l, !1, "" + r)
                    }
                    ) : this._PostResultToRuntime(l, !0, p)
                } else
                    console.warn(`[DOM] No handler '${c}' for component '${k}'`);
            else
                console.warn(`[DOM] No event handlers for component '${k}'`)
        }
        _PostResultToRuntime(g, k, c) {
            let e;
            c && c.transferables && (e = c.transferables);
            this._messageChannelPort.postMessage({
                type: "result",
                responseId: g,
                isOk: k,
                result: c
            }, e)
        }
        _OnResultFromRuntime(g) {
            const k = g.responseId
              , c = g.isOk;
            g = g.result;
            const e = w.get(k);
            c ? e.resolve(g) : e.reject(g);
            w.delete(k)
        }
        AddRuntimeComponentMessageHandler(g, k, c) {
            let e = v.get(g);
            e || (e = new Map,
            v.set(g, e));
            if (e.has(k))
                throw Error(`[DOM] Component '${g}' already has handler '${k}'`);
            e.set(k, c)
        }
        static AddDOMHandlerClass(g) {
            if (t.includes(g))
                throw Error("DOM handler already added");
            t.push(g)
        }
        _FindRuntimeDOMHandler() {
            for (const g of this._domHandlers)
                if ("runtime" === g.GetComponentID()) {
                    this._runtimeDomHandler = g;
                    return
                }
            throw Error("cannot find runtime DOM handler");
        }
        _OnMessageFromDebugger(g) {
            this.PostToRuntimeComponent("debugger", "message", g)
        }
        _OnRuntimeReady() {
            for (const g of this._domHandlers)
                g.Attach()
        }
        static IsDocumentFullscreen() {
            return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement)
        }
        async GetRemotePreviewStatusInfo() {
            return await this.PostToRuntimeComponentAsync("runtime", "get-remote-preview-status-info")
        }
        _AddRAFCallback(g) {
            this._rafCallbacks.push(g);
            this._RequestAnimationFrame()
        }
        _RemoveRAFCallback(g) {
            g = this._rafCallbacks.indexOf(g);
            if (-1 === g)
                throw Error("invalid callback");
            this._rafCallbacks.splice(g, 1);
            this._rafCallbacks.length || this._CancelAnimationFrame()
        }
        _RequestAnimationFrame() {
            -1 === this._rafId && this._rafCallbacks.length && (this._rafId = requestAnimationFrame(this._rafFunc))
        }
        _CancelAnimationFrame() {
            -1 !== this._rafId && (cancelAnimationFrame(this._rafId),
            this._rafId = -1)
        }
        _OnRAFCallback() {
            this._rafId = -1;
            for (const g of this._rafCallbacks)
                g();
            this._RequestAnimationFrame()
        }
        TryPlayMedia(g) {
            this._runtimeDomHandler.TryPlayMedia(g)
        }
        RemovePendingPlay(g) {
            this._runtimeDomHandler.RemovePendingPlay(g)
        }
        _PlayPendingMedia() {
            this._runtimeDomHandler._PlayPendingMedia()
        }
        SetSilent(g) {
            this._runtimeDomHandler.SetSilent(g)
        }
        IsAudioFormatSupported(g) {
            return !!d[g]
        }
        async _WasmDecodeWebMOpus(g) {
            g = await this.PostToRuntimeComponentAsync("runtime", "opus-decode", {
                arrayBuffer: g
            }, null, [g]);
            return new Float32Array(g)
        }
        IsAbsoluteURL(g) {
            return /^(?:[a-z]+:)?\/\//.test(g) || "data:" === g.substr(0, 5) || "blob:" === g.substr(0, 5)
        }
        IsRelativeURL(g) {
            return !this.IsAbsoluteURL(g)
        }
        async _OnCordovaFetchLocalFile(g) {
            const k = g.filename;
            switch (g.as) {
            case "text":
                return await this.CordovaFetchLocalFileAsText(k);
            case "buffer":
                return await this.CordovaFetchLocalFileAsArrayBuffer(k);
            default:
                throw Error("unsupported type");
            }
        }
        _GetPermissionAPI() {
            const g = window.cordova && window.cordova.plugins && window.cordova.plugins.permissions;
            if ("object" !== typeof g)
                throw Error("Permission API is not loaded");
            return g
        }
        _MapPermissionID(g, k) {
            g = g[k];
            if ("string" !== typeof g)
                throw Error("Invalid permission name");
            return g
        }
        _HasPermission(g) {
            const k = this._GetPermissionAPI();
            return new Promise((c,e)=>k.checkPermission(this._MapPermissionID(k, g), l=>c(!!l.hasPermission), e))
        }
        _RequestPermission(g) {
            const k = this._GetPermissionAPI();
            return new Promise((c,e)=>k.requestPermission(this._MapPermissionID(k, g), l=>c(!!l.hasPermission), e))
        }
        async RequestPermissions(g) {
            if ("cordova" !== this.GetExportType() || this.IsiOSCordova())
                return !0;
            for (const k of g)
                if (!await this._HasPermission(k) && !1 === await this._RequestPermission(k))
                    return !1;
            return !0
        }
        async RequirePermissions(...g) {
            if (!1 === await this.RequestPermissions(g))
                throw Error("Permission not granted");
        }
        CordovaFetchLocalFile(g) {
            const k = window.cordova.file.applicationDirectory + "www/" + g.toLowerCase();
            return new Promise((c,e)=>{
                window.resolveLocalFileSystemURL(k, l=>{
                    l.file(c, e)
                }
                , e)
            }
            )
        }
        async CordovaFetchLocalFileAsText(g) {
            g = await this.CordovaFetchLocalFile(g);
            return await h(g)
        }
        _CordovaMaybeStartNextArrayBufferRead() {
            if (q.length && !(8 <= n)) {
                n++;
                var g = q.shift();
                this._CordovaDoFetchLocalFileAsAsArrayBuffer(g.filename, g.successCallback, g.errorCallback)
            }
        }
        CordovaFetchLocalFileAsArrayBuffer(g) {
            return new Promise((k,c)=>{
                q.push({
                    filename: g,
                    successCallback: e=>{
                        n--;
                        this._CordovaMaybeStartNextArrayBufferRead();
                        k(e)
                    }
                    ,
                    errorCallback: e=>{
                        n--;
                        this._CordovaMaybeStartNextArrayBufferRead();
                        c(e)
                    }
                });
                this._CordovaMaybeStartNextArrayBufferRead()
            }
            )
        }
        async _CordovaDoFetchLocalFileAsAsArrayBuffer(g, k, c) {
            try {
                const e = await this.CordovaFetchLocalFile(g)
                  , l = await m(e);
                k(l)
            } catch (e) {
                c(e)
            }
        }
        async _ConvertDataUrisToBlobs() {
            const g = [];
            for (const [k,c] of Object.entries(this._localFileBlobs))
                g.push(this._ConvertDataUriToBlobs(k, c));
            await Promise.all(g)
        }
        async _ConvertDataUriToBlobs(g, k) {
            if ("object" === typeof k)
                this._localFileBlobs[g] = new Blob([k.str],{
                    type: k.type
                }),
                this._localFileStrings[g] = k.str;
            else {
                let c = await this._FetchDataUri(k);
                c || (c = this._DataURIToBinaryBlobSync(k));
                this._localFileBlobs[g] = c
            }
        }
        async _FetchDataUri(g) {
            try {
                return await (await fetch(g)).blob()
            } catch (k) {
                return console.warn("Failed to fetch a data: URI. Falling back to a slower workaround. This is probably because the Content Security Policy unnecessarily blocked it. Allow data: URIs in your CSP to avoid this.", k),
                null
            }
        }
        _DataURIToBinaryBlobSync(g) {
            g = this._ParseDataURI(g);
            return this._BinaryStringToBlob(g.data, g.mime_type)
        }
        _ParseDataURI(g) {
            var k = g.indexOf(",");
            if (0 > k)
                throw new URIError("expected comma in data: uri");
            var c = g.substring(5, k);
            g = g.substring(k + 1);
            k = c.split(";");
            c = k[0] || "";
            const e = k[2];
            g = "base64" === k[1] || "base64" === e ? atob(g) : decodeURIComponent(g);
            return {
                mime_type: c,
                data: g
            }
        }
        _BinaryStringToBlob(g, k) {
            var c = g.length;
            let e = c >> 2, l = new Uint8Array(c), p = new Uint32Array(l.buffer,0,e), r, x;
            for (x = r = 0; r < e; ++r)
                p[r] = g.charCodeAt(x++) | g.charCodeAt(x++) << 8 | g.charCodeAt(x++) << 16 | g.charCodeAt(x++) << 24;
            for (c &= 3; c--; )
                l[x] = g.charCodeAt(x),
                ++x;
            return new Blob([l],{
                type: k
            })
        }
    }
}
"use strict";
{
    const f = self.RuntimeInterface;
    function a(c) {
        return c.sourceCapabilities && c.sourceCapabilities.firesTouchEvents || c.originalEvent && c.originalEvent.sourceCapabilities && c.originalEvent.sourceCapabilities.firesTouchEvents
    }
    const b = new Map([["OSLeft", "MetaLeft"], ["OSRight", "MetaRight"]])
      , d = {
        dispatchRuntimeEvent: !0,
        dispatchUserScriptEvent: !0
    }
      , h = {
        dispatchUserScriptEvent: !0
    }
      , m = {
        dispatchRuntimeEvent: !0
    };
    function q(c) {
        return new Promise((e,l)=>{
            const p = document.createElement("link");
            p.onload = ()=>e(p);
            p.onerror = r=>l(r);
            p.rel = "stylesheet";
            p.href = c;
            document.head.appendChild(p)
        }
        )
    }
    function n(c) {
        return new Promise((e,l)=>{
            const p = new Image;
            p.onload = ()=>e(p);
            p.onerror = r=>l(r);
            p.src = c
        }
        )
    }
    async function t(c) {
        c = URL.createObjectURL(c);
        try {
            return await n(c)
        } finally {
            URL.revokeObjectURL(c)
        }
    }
    function v(c) {
        return new Promise((e,l)=>{
            let p = new FileReader;
            p.onload = r=>e(r.target.result);
            p.onerror = r=>l(r);
            p.readAsText(c)
        }
        )
    }
    async function w(c, e, l) {
        if (!/firefox/i.test(navigator.userAgent))
            return await t(c);
        var p = await v(c);
        p = (new DOMParser).parseFromString(p, "image/svg+xml");
        const r = p.documentElement;
        if (r.hasAttribute("width") && r.hasAttribute("height")) {
            const x = r.getAttribute("width")
              , C = r.getAttribute("height");
            if (!x.includes("%") && !C.includes("%"))
                return await t(c)
        }
        r.setAttribute("width", e + "px");
        r.setAttribute("height", l + "px");
        p = (new XMLSerializer).serializeToString(p);
        c = new Blob([p],{
            type: "image/svg+xml"
        });
        return await t(c)
    }
    function y(c) {
        do {
            if (c.parentNode && c.hasAttribute("contenteditable"))
                return !0;
            c = c.parentNode
        } while (c);
        return !1
    }
    const A = new Set(["canvas", "body", "html"]);
    function z(c) {
        const e = c.target.tagName.toLowerCase();
        A.has(e) && c.preventDefault()
    }
    function B(c) {
        (c.metaKey || c.ctrlKey) && c.preventDefault()
    }
    self.C3_GetSvgImageSize = async function(c) {
        c = await t(c);
        if (0 < c.width && 0 < c.height)
            return [c.width, c.height];
        {
            c.style.position = "absolute";
            c.style.left = "0px";
            c.style.top = "0px";
            c.style.visibility = "hidden";
            document.body.appendChild(c);
            const e = c.getBoundingClientRect();
            document.body.removeChild(c);
            return [e.width, e.height]
        }
    }
    ;
    self.C3_RasterSvgImageBlob = async function(c, e, l, p, r) {
        c = await w(c, e, l);
        const x = document.createElement("canvas");
        x.width = p;
        x.height = r;
        x.getContext("2d").drawImage(c, 0, 0, e, l);
        return x
    }
    ;
    let u = !1;
    document.addEventListener("pause", ()=>u = !0);
    document.addEventListener("resume", ()=>u = !1);
    function g() {
        try {
            return window.parent && window.parent.document.hasFocus()
        } catch (c) {
            return !1
        }
    }
    function k() {
        const c = document.activeElement;
        if (!c)
            return !1;
        const e = c.tagName.toLowerCase()
          , l = new Set("email number password search tel text url".split(" "));
        return "textarea" === e ? !0 : "input" === e ? l.has(c.type.toLowerCase() || "text") : y(c)
    }
    f.AddDOMHandlerClass(class extends self.DOMHandler {
        constructor(c) {
            super(c, "runtime");
            this._isFirstSizeUpdate = !0;
            this._simulatedResizeTimerId = -1;
            this._targetOrientation = "any";
            this._attachedDeviceMotionEvent = this._attachedDeviceOrientationEvent = !1;
            this._lastPointerRawUpdateEvent = this._pointerRawUpdateRateLimiter = this._debugHighlightElem = null;
            c.AddRuntimeComponentMessageHandler("canvas", "update-size", p=>this._OnUpdateCanvasSize(p));
            c.AddRuntimeComponentMessageHandler("runtime", "invoke-download", p=>this._OnInvokeDownload(p));
            c.AddRuntimeComponentMessageHandler("runtime", "raster-svg-image", p=>this._OnRasterSvgImage(p));
            c.AddRuntimeComponentMessageHandler("runtime", "get-svg-image-size", p=>this._OnGetSvgImageSize(p));
            c.AddRuntimeComponentMessageHandler("runtime", "set-target-orientation", p=>this._OnSetTargetOrientation(p));
            c.AddRuntimeComponentMessageHandler("runtime", "register-sw", ()=>this._OnRegisterSW());
            c.AddRuntimeComponentMessageHandler("runtime", "post-to-debugger", p=>this._OnPostToDebugger(p));
            c.AddRuntimeComponentMessageHandler("runtime", "go-to-script", p=>this._OnPostToDebugger(p));
            c.AddRuntimeComponentMessageHandler("runtime", "before-start-ticking", ()=>this._OnBeforeStartTicking());
            c.AddRuntimeComponentMessageHandler("runtime", "debug-highlight", p=>this._OnDebugHighlight(p));
            c.AddRuntimeComponentMessageHandler("runtime", "enable-device-orientation", ()=>this._AttachDeviceOrientationEvent());
            c.AddRuntimeComponentMessageHandler("runtime", "enable-device-motion", ()=>this._AttachDeviceMotionEvent());
            c.AddRuntimeComponentMessageHandler("runtime", "add-stylesheet", p=>this._OnAddStylesheet(p));
            c.AddRuntimeComponentMessageHandler("runtime", "alert", p=>this._OnAlert(p));
            c.AddRuntimeComponentMessageHandler("runtime", "hide-cordova-splash", ()=>this._OnHideCordovaSplash());
            const e = new Set(["input", "textarea", "datalist"]);
            window.addEventListener("contextmenu", p=>{
                const r = p.target
                  , x = r.tagName.toLowerCase();
                e.has(x) || y(r) || p.preventDefault()
            }
            );
            const l = c.GetCanvas();
            window.addEventListener("selectstart", z);
            window.addEventListener("gesturehold", z);
            l.addEventListener("selectstart", z);
            l.addEventListener("gesturehold", z);
            window.addEventListener("touchstart", z, {
                passive: !1
            });
            "undefined" !== typeof PointerEvent ? (window.addEventListener("pointerdown", z, {
                passive: !1
            }),
            l.addEventListener("pointerdown", z)) : l.addEventListener("touchstart", z);
            this._mousePointerLastButtons = 0;
            window.addEventListener("mousedown", p=>{
                1 === p.button && p.preventDefault()
            }
            );
            window.addEventListener("mousewheel", B, {
                passive: !1
            });
            window.addEventListener("wheel", B, {
                passive: !1
            });
            window.addEventListener("resize", ()=>this._OnWindowResize());
            c.IsiOSWebView() && window.addEventListener("focusout", ()=>{
                k() || (document.scrollingElement.scrollTop = 0)
            }
            );
            this._mediaPendingPlay = new Set;
            this._mediaRemovedPendingPlay = new WeakSet;
            this._isSilent = !1
        }
        _OnBeforeStartTicking() {
            "cordova" === this._iRuntime.GetExportType() ? (document.addEventListener("pause", ()=>this._OnVisibilityChange(!0)),
            document.addEventListener("resume", ()=>this._OnVisibilityChange(!1))) : document.addEventListener("visibilitychange", ()=>this._OnVisibilityChange(document.hidden));
            return {
                isSuspended: !(!document.hidden && !u)
            }
        }
        Attach() {
            window.addEventListener("focus", ()=>this._PostRuntimeEvent("window-focus"));
            window.addEventListener("blur", ()=>{
                this._PostRuntimeEvent("window-blur", {
                    parentHasFocus: g()
                });
                this._mousePointerLastButtons = 0
            }
            );
            window.addEventListener("fullscreenchange", ()=>this._OnFullscreenChange());
            window.addEventListener("webkitfullscreenchange", ()=>this._OnFullscreenChange());
            window.addEventListener("mozfullscreenchange", ()=>this._OnFullscreenChange());
            window.addEventListener("fullscreenerror", e=>this._OnFullscreenError(e));
            window.addEventListener("webkitfullscreenerror", e=>this._OnFullscreenError(e));
            window.addEventListener("mozfullscreenerror", e=>this._OnFullscreenError(e));
            window.addEventListener("keydown", e=>this._OnKeyEvent("keydown", e));
            window.addEventListener("keyup", e=>this._OnKeyEvent("keyup", e));
            window.addEventListener("dblclick", e=>this._OnMouseEvent("dblclick", e, d));
            window.addEventListener("wheel", e=>this._OnMouseWheelEvent("wheel", e));
            "undefined" !== typeof PointerEvent ? (window.addEventListener("pointerdown", e=>{
                this._HandlePointerDownFocus(e);
                this._OnPointerEvent("pointerdown", e)
            }
            ),
            this._iRuntime.UsesWorker() && "undefined" !== typeof window.onpointerrawupdate && self === self.top ? (this._pointerRawUpdateRateLimiter = new self.RateLimiter(()=>this._DoSendPointerRawUpdate(),5),
            this._pointerRawUpdateRateLimiter.SetCanRunImmediate(!0),
            window.addEventListener("pointerrawupdate", e=>this._OnPointerRawUpdate(e))) : window.addEventListener("pointermove", e=>this._OnPointerEvent("pointermove", e)),
            window.addEventListener("pointerup", e=>this._OnPointerEvent("pointerup", e)),
            window.addEventListener("pointercancel", e=>this._OnPointerEvent("pointercancel", e))) : (window.addEventListener("mousedown", e=>{
                this._HandlePointerDownFocus(e);
                this._OnMouseEventAsPointer("pointerdown", e)
            }
            ),
            window.addEventListener("mousemove", e=>this._OnMouseEventAsPointer("pointermove", e)),
            window.addEventListener("mouseup", e=>this._OnMouseEventAsPointer("pointerup", e)),
            window.addEventListener("touchstart", e=>{
                this._HandlePointerDownFocus(e);
                this._OnTouchEvent("pointerdown", e)
            }
            ),
            window.addEventListener("touchmove", e=>this._OnTouchEvent("pointermove", e)),
            window.addEventListener("touchend", e=>this._OnTouchEvent("pointerup", e)),
            window.addEventListener("touchcancel", e=>this._OnTouchEvent("pointercancel", e)));
            const c = ()=>this._PlayPendingMedia();
            window.addEventListener("pointerup", c, !0);
            window.addEventListener("touchend", c, !0);
            window.addEventListener("click", c, !0);
            window.addEventListener("keydown", c, !0);
            window.addEventListener("gamepadconnected", c, !0)
        }
        _PostRuntimeEvent(c, e) {
            this.PostToRuntime(c, e || null, m)
        }
        _GetWindowInnerWidth() {
            return this._iRuntime._GetWindowInnerWidth()
        }
        _GetWindowInnerHeight() {
            return this._iRuntime._GetWindowInnerHeight()
        }
        _OnWindowResize() {
            const c = this._GetWindowInnerWidth()
              , e = this._GetWindowInnerHeight();
            this._PostRuntimeEvent("window-resize", {
                innerWidth: c,
                innerHeight: e,
                devicePixelRatio: window.devicePixelRatio
            });
            this._iRuntime.IsiOSWebView() && (-1 !== this._simulatedResizeTimerId && clearTimeout(this._simulatedResizeTimerId),
            this._OnSimulatedResize(c, e, 0))
        }
        _ScheduleSimulatedResize(c, e, l) {
            -1 !== this._simulatedResizeTimerId && clearTimeout(this._simulatedResizeTimerId);
            this._simulatedResizeTimerId = setTimeout(()=>this._OnSimulatedResize(c, e, l), 48)
        }
        _OnSimulatedResize(c, e, l) {
            const p = this._GetWindowInnerWidth()
              , r = this._GetWindowInnerHeight();
            this._simulatedResizeTimerId = -1;
            p != c || r != e ? this._PostRuntimeEvent("window-resize", {
                innerWidth: p,
                innerHeight: r,
                devicePixelRatio: window.devicePixelRatio
            }) : 10 > l && this._ScheduleSimulatedResize(p, r, l + 1)
        }
        _OnSetTargetOrientation(c) {
            this._targetOrientation = c.targetOrientation
        }
        _TrySetTargetOrientation() {
            const c = this._targetOrientation;
            if (screen.orientation && screen.orientation.lock)
                screen.orientation.lock(c).catch(e=>console.warn("[Construct 3] Failed to lock orientation: ", e));
            else
                try {
                    let e = !1;
                    screen.lockOrientation ? e = screen.lockOrientation(c) : screen.webkitLockOrientation ? e = screen.webkitLockOrientation(c) : screen.mozLockOrientation ? e = screen.mozLockOrientation(c) : screen.msLockOrientation && (e = screen.msLockOrientation(c));
                    e || console.warn("[Construct 3] Failed to lock orientation")
                } catch (e) {
                    console.warn("[Construct 3] Failed to lock orientation: ", e)
                }
        }
        _OnFullscreenChange() {
            const c = f.IsDocumentFullscreen();
            c && "any" !== this._targetOrientation && this._TrySetTargetOrientation();
            this.PostToRuntime("fullscreenchange", {
                isFullscreen: c,
                innerWidth: this._GetWindowInnerWidth(),
                innerHeight: this._GetWindowInnerHeight()
            })
        }
        _OnFullscreenError(c) {
            console.warn("[Construct 3] Fullscreen request failed: ", c);
            this.PostToRuntime("fullscreenerror", {
                isFullscreen: f.IsDocumentFullscreen(),
                innerWidth: this._GetWindowInnerWidth(),
                innerHeight: this._GetWindowInnerHeight()
            })
        }
        _OnVisibilityChange(c) {
            c ? this._iRuntime._CancelAnimationFrame() : this._iRuntime._RequestAnimationFrame();
            this.PostToRuntime("visibilitychange", {
                hidden: c
            })
        }
        _OnKeyEvent(c, e) {
            "Backspace" === e.key && z(e);
            const l = b.get(e.code) || e.code;
            this._PostToRuntimeMaybeSync(c, {
                code: l,
                key: e.key,
                which: e.which,
                repeat: e.repeat,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey,
                shiftKey: e.shiftKey,
                timeStamp: e.timeStamp
            }, d)
        }
        _OnMouseWheelEvent(c, e) {
            this.PostToRuntime(c, {
                clientX: e.clientX,
                clientY: e.clientY,
                pageX: e.pageX,
                pageY: e.pageY,
                deltaX: e.deltaX,
                deltaY: e.deltaY,
                deltaZ: e.deltaZ,
                deltaMode: e.deltaMode,
                timeStamp: e.timeStamp
            }, d)
        }
        _OnMouseEvent(c, e, l) {
            a(e) || this._PostToRuntimeMaybeSync(c, {
                button: e.button,
                buttons: e.buttons,
                clientX: e.clientX,
                clientY: e.clientY,
                pageX: e.pageX,
                pageY: e.pageY,
                timeStamp: e.timeStamp
            }, l)
        }
        _OnMouseEventAsPointer(c, e) {
            if (!a(e)) {
                var l = this._mousePointerLastButtons;
                "pointerdown" === c && 0 !== l ? c = "pointermove" : "pointerup" === c && 0 !== e.buttons && (c = "pointermove");
                this._PostToRuntimeMaybeSync(c, {
                    pointerId: 1,
                    pointerType: "mouse",
                    button: e.button,
                    buttons: e.buttons,
                    lastButtons: l,
                    clientX: e.clientX,
                    clientY: e.clientY,
                    pageX: e.pageX,
                    pageY: e.pageY,
                    width: 0,
                    height: 0,
                    pressure: 0,
                    tangentialPressure: 0,
                    tiltX: 0,
                    tiltY: 0,
                    twist: 0,
                    timeStamp: e.timeStamp
                }, d);
                this._mousePointerLastButtons = e.buttons;
                this._OnMouseEvent(e.type, e, h)
            }
        }
        _OnPointerEvent(c, e) {
            this._pointerRawUpdateRateLimiter && "pointermove" !== c && this._pointerRawUpdateRateLimiter.Reset();
            var l = 0;
            "mouse" === e.pointerType && (l = this._mousePointerLastButtons);
            this._PostToRuntimeMaybeSync(c, {
                pointerId: e.pointerId,
                pointerType: e.pointerType,
                button: e.button,
                buttons: e.buttons,
                lastButtons: l,
                clientX: e.clientX,
                clientY: e.clientY,
                pageX: e.pageX,
                pageY: e.pageY,
                width: e.width || 0,
                height: e.height || 0,
                pressure: e.pressure || 0,
                tangentialPressure: e.tangentialPressure || 0,
                tiltX: e.tiltX || 0,
                tiltY: e.tiltY || 0,
                twist: e.twist || 0,
                timeStamp: e.timeStamp
            }, d);
            "mouse" === e.pointerType && (l = "mousemove",
            "pointerdown" === c ? l = "mousedown" : "pointerup" === c && (l = "pointerup"),
            this._OnMouseEvent(l, e, h),
            this._mousePointerLastButtons = e.buttons)
        }
        _OnPointerRawUpdate(c) {
            this._lastPointerRawUpdateEvent = c;
            this._pointerRawUpdateRateLimiter.Call()
        }
        _DoSendPointerRawUpdate() {
            this._OnPointerEvent("pointermove", this._lastPointerRawUpdateEvent);
            this._lastPointerRawUpdateEvent = null
        }
        _OnTouchEvent(c, e) {
            for (let l = 0, p = e.changedTouches.length; l < p; ++l) {
                const r = e.changedTouches[l];
                this._PostToRuntimeMaybeSync(c, {
                    pointerId: r.identifier,
                    pointerType: "touch",
                    button: 0,
                    buttons: 0,
                    lastButtons: 0,
                    clientX: r.clientX,
                    clientY: r.clientY,
                    pageX: r.pageX,
                    pageY: r.pageY,
                    width: 2 * (r.radiusX || r.webkitRadiusX || 0),
                    height: 2 * (r.radiusY || r.webkitRadiusY || 0),
                    pressure: r.force || r.webkitForce || 0,
                    tangentialPressure: 0,
                    tiltX: 0,
                    tiltY: 0,
                    twist: r.rotationAngle || 0,
                    timeStamp: e.timeStamp
                }, d)
            }
        }
        _HandlePointerDownFocus(c) {
            window !== window.top && window.focus();
            this._IsElementCanvasOrDocument(c.target) && document.activeElement && !this._IsElementCanvasOrDocument(document.activeElement) && document.activeElement.blur()
        }
        _IsElementCanvasOrDocument(c) {
            return !c || c === document || c === window || c === document.body || "canvas" === c.tagName.toLowerCase()
        }
        _AttachDeviceOrientationEvent() {
            this._attachedDeviceOrientationEvent || (this._attachedDeviceOrientationEvent = !0,
            window.addEventListener("deviceorientation", c=>this._OnDeviceOrientation(c)),
            window.addEventListener("deviceorientationabsolute", c=>this._OnDeviceOrientationAbsolute(c)))
        }
        _AttachDeviceMotionEvent() {
            this._attachedDeviceMotionEvent || (this._attachedDeviceMotionEvent = !0,
            window.addEventListener("devicemotion", c=>this._OnDeviceMotion(c)))
        }
        _OnDeviceOrientation(c) {
            this.PostToRuntime("deviceorientation", {
                absolute: !!c.absolute,
                alpha: c.alpha || 0,
                beta: c.beta || 0,
                gamma: c.gamma || 0,
                timeStamp: c.timeStamp,
                webkitCompassHeading: c.webkitCompassHeading,
                webkitCompassAccuracy: c.webkitCompassAccuracy
            }, d)
        }
        _OnDeviceOrientationAbsolute(c) {
            this.PostToRuntime("deviceorientationabsolute", {
                absolute: !!c.absolute,
                alpha: c.alpha || 0,
                beta: c.beta || 0,
                gamma: c.gamma || 0,
                timeStamp: c.timeStamp
            }, d)
        }
        _OnDeviceMotion(c) {
            let e = null;
            var l = c.acceleration;
            l && (e = {
                x: l.x || 0,
                y: l.y || 0,
                z: l.z || 0
            });
            l = null;
            var p = c.accelerationIncludingGravity;
            p && (l = {
                x: p.x || 0,
                y: p.y || 0,
                z: p.z || 0
            });
            p = null;
            const r = c.rotationRate;
            r && (p = {
                alpha: r.alpha || 0,
                beta: r.beta || 0,
                gamma: r.gamma || 0
            });
            this.PostToRuntime("devicemotion", {
                acceleration: e,
                accelerationIncludingGravity: l,
                rotationRate: p,
                interval: c.interval,
                timeStamp: c.timeStamp
            }, d)
        }
        _OnUpdateCanvasSize(c) {
            const e = this.GetRuntimeInterface()
              , l = e.GetCanvas();
            l.style.width = c.styleWidth + "px";
            l.style.height = c.styleHeight + "px";
            l.style.marginLeft = c.marginLeft + "px";
            l.style.marginTop = c.marginTop + "px";
            e.MaybeForceBodySize();
            this._isFirstSizeUpdate && (l.style.display = "",
            this._isFirstSizeUpdate = !1)
        }
        _OnInvokeDownload(c) {
            const e = c.url;
            c = c.filename;
            const l = document.createElement("a")
              , p = document.body;
            l.textContent = c;
            l.href = e;
            l.download = c;
            p.appendChild(l);
            l.click();
            p.removeChild(l)
        }
        async _OnRasterSvgImage(c) {
            var e = c.imageBitmapOpts;
            c = await self.C3_RasterSvgImageBlob(c.blob, c.imageWidth, c.imageHeight, c.surfaceWidth, c.surfaceHeight);
            e = e ? await createImageBitmap(c, e) : await createImageBitmap(c);
            return {
                imageBitmap: e,
                transferables: [e]
            }
        }
        async _OnGetSvgImageSize(c) {
            return await self.C3_GetSvgImageSize(c.blob)
        }
        async _OnAddStylesheet(c) {
            await q(c.url)
        }
        _PlayPendingMedia() {
            var c = [...this._mediaPendingPlay];
            this._mediaPendingPlay.clear();
            if (!this._isSilent)
                for (const e of c)
                    (c = e.play()) && c.catch(l=>{
                        this._mediaRemovedPendingPlay.has(e) || this._mediaPendingPlay.add(e)
                    }
                    )
        }
        TryPlayMedia(c) {
            if ("function" !== typeof c.play)
                throw Error("missing play function");
            this._mediaRemovedPendingPlay.delete(c);
            let e;
            try {
                e = c.play()
            } catch (l) {
                this._mediaPendingPlay.add(c);
                return
            }
            e && e.catch(l=>{
                this._mediaRemovedPendingPlay.has(c) || this._mediaPendingPlay.add(c)
            }
            )
        }
        RemovePendingPlay(c) {
            this._mediaPendingPlay.delete(c);
            this._mediaRemovedPendingPlay.add(c)
        }
        SetSilent(c) {
            this._isSilent = !!c
        }
        _OnHideCordovaSplash() {
            navigator.splashscreen && navigator.splashscreen.hide && navigator.splashscreen.hide()
        }
        _OnDebugHighlight(c) {
            if (c.show) {
                this._debugHighlightElem || (this._debugHighlightElem = document.createElement("div"),
                this._debugHighlightElem.id = "inspectOutline",
                document.body.appendChild(this._debugHighlightElem));
                var e = this._debugHighlightElem;
                e.style.display = "";
                e.style.left = c.left - 1 + "px";
                e.style.top = c.top - 1 + "px";
                e.style.width = c.width + 2 + "px";
                e.style.height = c.height + 2 + "px";
                e.textContent = c.name
            } else
                this._debugHighlightElem && (this._debugHighlightElem.style.display = "none")
        }
        _OnRegisterSW() {
            window.C3_RegisterSW && window.C3_RegisterSW()
        }
        _OnPostToDebugger(c) {
            window.c3_postToMessagePort && (c.from = "runtime",
            window.c3_postToMessagePort(c))
        }
        _InvokeFunctionFromJS(c, e) {
            return this.PostToRuntimeAsync("js-invoke-function", {
                name: c,
                params: e
            })
        }
        _OnAlert(c) {
            alert(c.message)
        }
    }
    )
}
"use strict";
self.JobSchedulerDOM = class {
    constructor(f) {
        this._runtimeInterface = f;
        this._baseUrl = f.GetBaseURL();
        "preview" === f.GetExportType() ? this._baseUrl += "c3/workers/" : this._baseUrl += f.GetScriptFolder();
        this._maxNumWorkers = Math.min(navigator.hardwareConcurrency || 2, 16);
        this._dispatchWorker = null;
        this._jobWorkers = [];
        this._outputPort = this._inputPort = null
    }
    async Init() {
        if (this._hasInitialised)
            throw Error("already initialised");
        this._hasInitialised = !0;
        var f = this._runtimeInterface._GetWorkerURL("dispatchworker.js");
        this._dispatchWorker = await this._runtimeInterface.CreateWorker(f, this._baseUrl, {
            name: "DispatchWorker"
        });
        f = new MessageChannel;
        this._inputPort = f.port1;
        this._dispatchWorker.postMessage({
            type: "_init",
            "in-port": f.port2
        }, [f.port2]);
        this._outputPort = await this._CreateJobWorker()
    }
    async _CreateJobWorker() {
        const f = this._jobWorkers.length;
        var a = this._runtimeInterface._GetWorkerURL("jobworker.js");
        a = await this._runtimeInterface.CreateWorker(a, this._baseUrl, {
            name: "JobWorker" + f
        });
        const b = new MessageChannel
          , d = new MessageChannel;
        this._dispatchWorker.postMessage({
            type: "_addJobWorker",
            port: b.port1
        }, [b.port1]);
        a.postMessage({
            type: "init",
            number: f,
            "dispatch-port": b.port2,
            "output-port": d.port2
        }, [b.port2, d.port2]);
        this._jobWorkers.push(a);
        return d.port1
    }
    GetPortData() {
        return {
            inputPort: this._inputPort,
            outputPort: this._outputPort,
            maxNumWorkers: this._maxNumWorkers
        }
    }
    GetPortTransferables() {
        return [this._inputPort, this._outputPort]
    }
}
;
"use strict";
window.C3_IsSupported && (window.c3_runtimeInterface = new self.RuntimeInterface({
    useWorker: !0,
    workerMainUrl: "https://cdn.jsdelivr.net/gh/rojithpeiris1/assets@main/ZooSling/workermain.js",
    engineScripts: ["https://cdn.jsdelivr.net/gh/rojithpeiris1/assets@main/ZooSling/scripts/c3runtime.js"],
    scriptFolder: "scripts/",
    workerDependencyScripts: ["https://cdn.jsdelivr.net/gh/rojithpeiris1/assets@main/ZooSling/box2d.wasm.js"],
    exportType: "html5"
}));
"use strict";
{
    const f = 180 / Math.PI;
    self.AudioDOMHandler = class extends self.DOMHandler {
        constructor(a) {
            super(a, "audio");
            this._destinationNode = this._audioContext = null;
            this._hasAttachedUnblockEvents = this._hasUnblocked = !1;
            this._unblockFunc = ()=>this._UnblockAudioContext();
            this._audioBuffers = [];
            this._audioInstances = [];
            this._lastAudioInstance = null;
            this._lastPlayedTag = "";
            this._lastTickCount = -1;
            this._pendingTags = new Map;
            this._masterVolume = 1;
            this._isSilent = !1;
            this._timeScaleMode = 0;
            this._timeScale = 1;
            this._gameTime = 0;
            this._panningModel = "HRTF";
            this._distanceModel = "inverse";
            this._refDistance = 600;
            this._maxDistance = 1E4;
            this._rolloffFactor = 1;
            this._hasAnySoftwareDecodedMusic = this._playMusicAsSound = !1;
            this._supportsWebMOpus = this._iRuntime.IsAudioFormatSupported("audio/webm; codecs=opus");
            this._effects = new Map;
            this._analysers = new Set;
            this._isPendingPostFxState = !1;
            this._microphoneTag = "";
            this._microphoneSource = null;
            self.C3Audio_OnMicrophoneStream = (b,d)=>this._OnMicrophoneStream(b, d);
            this._destMediaStreamNode = null;
            self.C3Audio_GetOutputStream = ()=>this._OnGetOutputStream();
            self.C3Audio_DOMInterface = this;
            this.AddRuntimeMessageHandlers([["create-audio-context", b=>this._CreateAudioContext(b)], ["play", b=>this._Play(b)], ["stop", b=>this._Stop(b)], ["stop-all", ()=>this._StopAll()], ["set-paused", b=>this._SetPaused(b)], ["set-volume", b=>this._SetVolume(b)], ["fade-volume", b=>this._FadeVolume(b)], ["set-master-volume", b=>this._SetMasterVolume(b)], ["set-muted", b=>this._SetMuted(b)], ["set-silent", b=>this._SetSilent(b)], ["set-looping", b=>this._SetLooping(b)], ["set-playback-rate", b=>this._SetPlaybackRate(b)], ["seek", b=>this._Seek(b)], ["preload", b=>this._Preload(b)], ["unload", b=>this._Unload(b)], ["unload-all", ()=>this._UnloadAll()], ["set-suspended", b=>this._SetSuspended(b)], ["add-effect", b=>this._AddEffect(b)], ["set-effect-param", b=>this._SetEffectParam(b)], ["remove-effects", b=>this._RemoveEffects(b)], ["tick", b=>this._OnTick(b)], ["load-state", b=>this._OnLoadState(b)]])
        }
        async _CreateAudioContext(a) {
            a.isiOSCordova && (this._playMusicAsSound = !0);
            this._timeScaleMode = a.timeScaleMode;
            this._panningModel = ["equalpower", "HRTF", "soundfield"][a.panningModel];
            this._distanceModel = ["linear", "inverse", "exponential"][a.distanceModel];
            this._refDistance = a.refDistance;
            this._maxDistance = a.maxDistance;
            this._rolloffFactor = a.rolloffFactor;
            var b = {
                latencyHint: a.latencyHint
            };
            if ("undefined" !== typeof AudioContext)
                this._audioContext = new AudioContext(b);
            else if ("undefined" !== typeof webkitAudioContext)
                this._audioContext = new webkitAudioContext(b);
            else
                throw Error("Web Audio API not supported");
            this._AttachUnblockEvents();
            this._audioContext.onstatechange = ()=>{
                "running" !== this._audioContext.state && this._AttachUnblockEvents()
            }
            ;
            this._destinationNode = this._audioContext.createGain();
            this._destinationNode.connect(this._audioContext.destination);
            b = a.listenerPos;
            this._audioContext.listener.setPosition(b[0], b[1], b[2]);
            this._audioContext.listener.setOrientation(0, 0, 1, 0, -1, 0);
            self.C3_GetAudioContextCurrentTime = ()=>this.GetAudioCurrentTime();
            try {
                await Promise.all(a.preloadList.map(d=>this._GetAudioBuffer(d.originalUrl, d.url, d.type, !1)))
            } catch (d) {
                console.error("[Construct 3] Preloading sounds failed: ", d)
            }
            return {
                sampleRate: this._audioContext.sampleRate
            }
        }
        _AttachUnblockEvents() {
            this._hasAttachedUnblockEvents || (this._hasUnblocked = !1,
            window.addEventListener("pointerup", this._unblockFunc, !0),
            window.addEventListener("touchend", this._unblockFunc, !0),
            window.addEventListener("click", this._unblockFunc, !0),
            window.addEventListener("keydown", this._unblockFunc, !0),
            this._hasAttachedUnblockEvents = !0)
        }
        _DetachUnblockEvents() {
            this._hasAttachedUnblockEvents && (this._hasUnblocked = !0,
            window.removeEventListener("pointerup", this._unblockFunc, !0),
            window.removeEventListener("touchend", this._unblockFunc, !0),
            window.removeEventListener("click", this._unblockFunc, !0),
            window.removeEventListener("keydown", this._unblockFunc, !0),
            this._hasAttachedUnblockEvents = !1)
        }
        _UnblockAudioContext() {
            if (!this._hasUnblocked) {
                var a = this._audioContext;
                "suspended" === a.state && a.resume && a.resume();
                var b = a.createBuffer(1, 220, 22050)
                  , d = a.createBufferSource();
                d.buffer = b;
                d.connect(a.destination);
                d.start(0);
                "running" === a.state && this._DetachUnblockEvents()
            }
        }
        GetAudioContext() {
            return this._audioContext
        }
        GetAudioCurrentTime() {
            return this._audioContext.currentTime
        }
        GetDestinationNode() {
            return this._destinationNode
        }
        GetDestinationForTag(a) {
            return (a = this._effects.get(a.toLowerCase())) ? a[0].GetInputNode() : this.GetDestinationNode()
        }
        AddEffectForTag(a, b) {
            a = a.toLowerCase();
            let d = this._effects.get(a);
            d || (d = [],
            this._effects.set(a, d));
            b._SetIndex(d.length);
            b._SetTag(a);
            d.push(b);
            this._ReconnectEffects(a)
        }
        _ReconnectEffects(a) {
            let b = this.GetDestinationNode();
            const d = this._effects.get(a);
            if (d && d.length) {
                b = d[0].GetInputNode();
                for (let h = 0, m = d.length; h < m; ++h) {
                    const q = d[h];
                    h + 1 === m ? q.ConnectTo(this.GetDestinationNode()) : q.ConnectTo(d[h + 1].GetInputNode())
                }
            }
            for (const h of this.audioInstancesByTag(a))
                h.Reconnect(b);
            this._microphoneSource && this._microphoneTag === a && (this._microphoneSource.disconnect(),
            this._microphoneSource.connect(b))
        }
        GetMasterVolume() {
            return this._masterVolume
        }
        IsSilent() {
            return this._isSilent
        }
        GetTimeScaleMode() {
            return this._timeScaleMode
        }
        GetTimeScale() {
            return this._timeScale
        }
        GetGameTime() {
            return this._gameTime
        }
        IsPlayMusicAsSound() {
            return this._playMusicAsSound
        }
        SupportsWebMOpus() {
            return this._supportsWebMOpus
        }
        _SetHasAnySoftwareDecodedMusic() {
            this._hasAnySoftwareDecodedMusic = !0
        }
        GetPanningModel() {
            return this._panningModel
        }
        GetDistanceModel() {
            return this._distanceModel
        }
        GetReferenceDistance() {
            return this._refDistance
        }
        GetMaxDistance() {
            return this._maxDistance
        }
        GetRolloffFactor() {
            return this._rolloffFactor
        }
        DecodeAudioData(a, b) {
            return b ? this._iRuntime._WasmDecodeWebMOpus(a).then(d=>{
                const h = this._audioContext.createBuffer(1, d.length, 48E3);
                h.getChannelData(0).set(d);
                return h
            }
            ) : new Promise((d,h)=>{
                this._audioContext.decodeAudioData(a, d, h)
            }
            )
        }
        TryPlayMedia(a) {
            this._iRuntime.TryPlayMedia(a)
        }
        RemovePendingPlay(a) {
            this._iRuntime.RemovePendingPlay(a)
        }
        ReleaseInstancesForBuffer(a) {
            let b = 0;
            for (let d = 0, h = this._audioInstances.length; d < h; ++d) {
                const m = this._audioInstances[d];
                this._audioInstances[b] = m;
                m.GetBuffer() === a ? m.Release() : ++b
            }
            this._audioInstances.length = b
        }
        ReleaseAllMusicBuffers() {
            let a = 0;
            for (let b = 0, d = this._audioBuffers.length; b < d; ++b) {
                const h = this._audioBuffers[b];
                this._audioBuffers[a] = h;
                h.IsMusic() ? h.Release() : ++a
            }
            this._audioBuffers.length = a
        }
        *audioInstancesByTag(a) {
            if (a)
                for (const b of this._audioInstances)
                    self.AudioDOMHandler.EqualsNoCase(b.GetTag(), a) && (yield b);
            else
                this._lastAudioInstance && !this._lastAudioInstance.HasEnded() && (yield this._lastAudioInstance)
        }
        async _GetAudioBuffer(a, b, d, h, m) {
            for (const q of this._audioBuffers)
                if (q.GetUrl() === b)
                    return await q.Load(),
                    q;
            if (m)
                return null;
            h && (this._playMusicAsSound || this._hasAnySoftwareDecodedMusic) && this.ReleaseAllMusicBuffers();
            a = self.C3AudioBuffer.Create(this, a, b, d, h);
            this._audioBuffers.push(a);
            await a.Load();
            return a
        }
        async _GetAudioInstance(a, b, d, h, m) {
            for (const q of this._audioInstances)
                if (q.GetUrl() === b && (q.CanBeRecycled() || m))
                    return q.SetTag(h),
                    q;
            a = (await this._GetAudioBuffer(a, b, d, m)).CreateInstance(h);
            this._audioInstances.push(a);
            return a
        }
        _AddPendingTag(a) {
            let b = this._pendingTags.get(a);
            if (!b) {
                let d = null;
                b = {
                    pendingCount: 0,
                    promise: new Promise(h=>d = h),
                    resolve: d
                };
                this._pendingTags.set(a, b)
            }
            b.pendingCount++
        }
        _RemovePendingTag(a) {
            const b = this._pendingTags.get(a);
            if (!b)
                throw Error("expected pending tag");
            b.pendingCount--;
            0 === b.pendingCount && (b.resolve(),
            this._pendingTags.delete(a))
        }
        TagReady(a) {
            a || (a = this._lastPlayedTag);
            return (a = this._pendingTags.get(a)) ? a.promise : Promise.resolve()
        }
        _MaybeStartTicking() {
            if (0 < this._analysers.size)
                this._StartTicking();
            else
                for (const a of this._audioInstances)
                    if (a.IsActive()) {
                        this._StartTicking();
                        break
                    }
        }
        Tick() {
            for (var a of this._analysers)
                a.Tick();
            a = this.GetAudioCurrentTime();
            for (var b of this._audioInstances)
                b.Tick(a);
            b = this._audioInstances.filter(d=>d.IsActive()).map(d=>d.GetState());
            this.PostToRuntime("state", {
                tickCount: this._lastTickCount,
                audioInstances: b,
                analysers: [...this._analysers].map(d=>d.GetData())
            });
            0 === b.length && 0 === this._analysers.size && this._StopTicking()
        }
        PostTrigger(a, b, d) {
            this.PostToRuntime("trigger", {
                type: a,
                tag: b,
                aiid: d
            })
        }
        async _Play(a) {
            const b = a.originalUrl
              , d = a.url
              , h = a.type
              , m = a.isMusic
              , q = a.tag
              , n = a.isLooping
              , t = a.vol
              , v = a.pos
              , w = a.panning;
            let y = a.off;
            0 < y && !a.trueClock && (this._audioContext.getOutputTimestamp ? (a = this._audioContext.getOutputTimestamp(),
            y = y - a.performanceTime / 1E3 + a.contextTime) : y = y - performance.now() / 1E3 + this._audioContext.currentTime);
            this._lastPlayedTag = q;
            this._AddPendingTag(q);
            try {
                this._lastAudioInstance = await this._GetAudioInstance(b, d, h, q, m),
                w ? (this._lastAudioInstance.SetPannerEnabled(!0),
                this._lastAudioInstance.SetPan(w.x, w.y, w.angle, w.innerAngle, w.outerAngle, w.outerGain),
                w.hasOwnProperty("uid") && this._lastAudioInstance.SetUID(w.uid)) : this._lastAudioInstance.SetPannerEnabled(!1),
                this._lastAudioInstance.Play(n, t, v, y)
            } catch (A) {
                console.error("[Construct 3] Audio: error starting playback: ", A);
                return
            } finally {
                this._RemovePendingTag(q)
            }
            this._StartTicking()
        }
        _Stop(a) {
            a = a.tag;
            for (const b of this.audioInstancesByTag(a))
                b.Stop()
        }
        _StopAll() {
            for (const a of this._audioInstances)
                a.Stop()
        }
        _SetPaused(a) {
            const b = a.tag;
            a = a.paused;
            for (const d of this.audioInstancesByTag(b))
                a ? d.Pause() : d.Resume();
            this._MaybeStartTicking()
        }
        _SetVolume(a) {
            const b = a.tag;
            a = a.vol;
            for (const d of this.audioInstancesByTag(b))
                d.SetVolume(a)
        }
        async _FadeVolume(a) {
            const b = a.tag
              , d = a.vol
              , h = a.duration;
            a = a.stopOnEnd;
            await this.TagReady(b);
            for (const m of this.audioInstancesByTag(b))
                m.FadeVolume(d, h, a);
            this._MaybeStartTicking()
        }
        _SetMasterVolume(a) {
            this._masterVolume = a.vol;
            for (const b of this._audioInstances)
                b._UpdateVolume()
        }
        _SetMuted(a) {
            const b = a.tag;
            a = a.isMuted;
            for (const d of this.audioInstancesByTag(b))
                d.SetMuted(a)
        }
        _SetSilent(a) {
            this._isSilent = a.isSilent;
            this._iRuntime.SetSilent(this._isSilent);
            for (const b of this._audioInstances)
                b._UpdateMuted()
        }
        _SetLooping(a) {
            const b = a.tag;
            a = a.isLooping;
            for (const d of this.audioInstancesByTag(b))
                d.SetLooping(a)
        }
        async _SetPlaybackRate(a) {
            const b = a.tag;
            a = a.rate;
            await this.TagReady(b);
            for (const d of this.audioInstancesByTag(b))
                d.SetPlaybackRate(a)
        }
        async _Seek(a) {
            const b = a.tag;
            a = a.pos;
            await this.TagReady(b);
            for (const d of this.audioInstancesByTag(b))
                d.Seek(a)
        }
        async _Preload(a) {
            const b = a.originalUrl
              , d = a.url
              , h = a.type;
            a = a.isMusic;
            try {
                await this._GetAudioInstance(b, d, h, "", a)
            } catch (m) {
                console.error("[Construct 3] Audio: error preloading: ", m)
            }
        }
        async _Unload(a) {
            if (a = await this._GetAudioBuffer("", a.url, a.type, a.isMusic, !0))
                a.Release(),
                a = this._audioBuffers.indexOf(a),
                -1 !== a && this._audioBuffers.splice(a, 1)
        }
        _UnloadAll() {
            for (const a of this._audioBuffers)
                a.Release();
            this._audioBuffers.length = 0
        }
        _SetSuspended(a) {
            a = a.isSuspended;
            !a && this._audioContext.resume && this._audioContext.resume();
            for (const b of this._audioInstances)
                b.SetSuspended(a);
            a && this._audioContext.suspend && this._audioContext.suspend()
        }
        _OnTick(a) {
            this._timeScale = a.timeScale;
            this._gameTime = a.gameTime;
            this._lastTickCount = a.tickCount;
            if (0 !== this._timeScaleMode)
                for (var b of this._audioInstances)
                    b._UpdatePlaybackRate();
            (b = a.listenerPos) && this._audioContext.listener.setPosition(b[0], b[1], b[2]);
            for (const d of a.instPans) {
                a = d.uid;
                for (const h of this._audioInstances)
                    h.GetUID() === a && h.SetPanXYA(d.x, d.y, d.angle)
            }
        }
        async _AddEffect(a) {
            var b = a.type;
            const d = a.tag;
            var h = a.params;
            if ("filter" === b)
                h = new self.C3AudioFilterFX(this,...h);
            else if ("delay" === b)
                h = new self.C3AudioDelayFX(this,...h);
            else if ("convolution" === b) {
                b = null;
                try {
                    b = await this._GetAudioBuffer(a.bufferOriginalUrl, a.bufferUrl, a.bufferType, !1)
                } catch (m) {
                    console.log("[Construct 3] Audio: error loading convolution: ", m);
                    return
                }
                h = new self.C3AudioConvolveFX(this,b.GetAudioBuffer(),...h);
                h._SetBufferInfo(a.bufferOriginalUrl, a.bufferUrl, a.bufferType)
            } else if ("flanger" === b)
                h = new self.C3AudioFlangerFX(this,...h);
            else if ("phaser" === b)
                h = new self.C3AudioPhaserFX(this,...h);
            else if ("gain" === b)
                h = new self.C3AudioGainFX(this,...h);
            else if ("tremolo" === b)
                h = new self.C3AudioTremoloFX(this,...h);
            else if ("ringmod" === b)
                h = new self.C3AudioRingModFX(this,...h);
            else if ("distortion" === b)
                h = new self.C3AudioDistortionFX(this,...h);
            else if ("compressor" === b)
                h = new self.C3AudioCompressorFX(this,...h);
            else if ("analyser" === b)
                h = new self.C3AudioAnalyserFX(this,...h);
            else
                throw Error("invalid effect type");
            this.AddEffectForTag(d, h);
            this._PostUpdatedFxState()
        }
        _SetEffectParam(a) {
            const b = a.index
              , d = a.param
              , h = a.value
              , m = a.ramp
              , q = a.time;
            a = this._effects.get(a.tag);
            !a || 0 > b || b >= a.length || (a[b].SetParam(d, h, m, q),
            this._PostUpdatedFxState())
        }
        _RemoveEffects(a) {
            a = a.tag.toLowerCase();
            const b = this._effects.get(a);
            if (b && b.length) {
                for (const d of b)
                    d.Release();
                this._effects.delete(a);
                this._ReconnectEffects(a)
            }
        }
        _AddAnalyser(a) {
            this._analysers.add(a);
            this._MaybeStartTicking()
        }
        _RemoveAnalyser(a) {
            this._analysers.delete(a)
        }
        _PostUpdatedFxState() {
            this._isPendingPostFxState || (this._isPendingPostFxState = !0,
            Promise.resolve().then(()=>this._DoPostUpdatedFxState()))
        }
        _DoPostUpdatedFxState() {
            const a = {};
            for (const [b,d] of this._effects)
                a[b] = d.map(h=>h.GetState());
            this.PostToRuntime("fxstate", {
                fxstate: a
            });
            this._isPendingPostFxState = !1
        }
        async _OnLoadState(a) {
            const b = a.saveLoadMode;
            if (3 !== b)
                for (var d of this._audioInstances)
                    d.IsMusic() && 1 === b || (d.IsMusic() || 2 !== b) && d.Stop();
            for (const h of this._effects.values())
                for (const m of h)
                    m.Release();
            this._effects.clear();
            this._timeScale = a.timeScale;
            this._gameTime = a.gameTime;
            d = a.listenerPos;
            this._audioContext.listener.setPosition(d[0], d[1], d[2]);
            this._isSilent = a.isSilent;
            this._iRuntime.SetSilent(this._isSilent);
            this._masterVolume = a.masterVolume;
            d = [];
            for (const h of Object.values(a.effects))
                d.push(Promise.all(h.map(m=>this._AddEffect(m))));
            await Promise.all(d);
            await Promise.all(a.playing.map(h=>this._LoadAudioInstance(h, b)));
            this._MaybeStartTicking()
        }
        async _LoadAudioInstance(a, b) {
            if (3 !== b) {
                var d = a.bufferOriginalUrl
                  , h = a.bufferUrl
                  , m = a.bufferType
                  , q = a.isMusic
                  , n = a.tag
                  , t = a.isLooping
                  , v = a.volume
                  , w = a.playbackTime;
                if (!q || 1 !== b)
                    if (q || 2 !== b) {
                        b = null;
                        try {
                            b = await this._GetAudioInstance(d, h, m, n, q)
                        } catch (y) {
                            console.error("[Construct 3] Audio: error loading audio state: ", y);
                            return
                        }
                        b.LoadPanState(a.pan);
                        b.Play(t, v, w, 0);
                        a.isPlaying || b.Pause();
                        b._LoadAdditionalState(a)
                    }
            }
        }
        _OnMicrophoneStream(a, b) {
            this._microphoneSource && this._microphoneSource.disconnect();
            this._microphoneTag = b.toLowerCase();
            this._microphoneSource = this._audioContext.createMediaStreamSource(a);
            this._microphoneSource.connect(this.GetDestinationForTag(this._microphoneTag))
        }
        _OnGetOutputStream() {
            this._destMediaStreamNode || (this._destMediaStreamNode = this._audioContext.createMediaStreamDestination(),
            this._destinationNode.connect(this._destMediaStreamNode));
            return this._destMediaStreamNode.stream
        }
        static EqualsNoCase(a, b) {
            return a.length !== b.length ? !1 : a === b ? !0 : a.toLowerCase() === b.toLowerCase()
        }
        static ToDegrees(a) {
            return a * f
        }
        static DbToLinearNoCap(a) {
            return Math.pow(10, a / 20)
        }
        static DbToLinear(a) {
            return Math.max(Math.min(self.AudioDOMHandler.DbToLinearNoCap(a), 1), 0)
        }
        static LinearToDbNoCap(a) {
            return Math.log(a) / Math.log(10) * 20
        }
        static LinearToDb(a) {
            return self.AudioDOMHandler.LinearToDbNoCap(Math.max(Math.min(a, 1), 0))
        }
        static e4(a, b) {
            return 1 - Math.exp(-b * a)
        }
    }
    ;
    self.RuntimeInterface.AddDOMHandlerClass(self.AudioDOMHandler)
}
"use strict";
self.C3AudioBuffer = class {
    constructor(f, a, b, d, h) {
        this._audioDomHandler = f;
        this._originalUrl = a;
        this._url = b;
        this._type = d;
        this._isMusic = h;
        this._api = "";
        this._loadState = "not-loaded";
        this._loadPromise = null
    }
    Release() {
        this._loadState = "not-loaded";
        this._loadPromise = this._audioDomHandler = null
    }
    static Create(f, a, b, d, h) {
        const m = "audio/webm; codecs=opus" === d && !f.SupportsWebMOpus();
        h && m && f._SetHasAnySoftwareDecodedMusic();
        return !h || f.IsPlayMusicAsSound() || m ? new self.C3WebAudioBuffer(f,a,b,d,h,m) : new self.C3Html5AudioBuffer(f,a,b,d,h)
    }
    CreateInstance(f) {
        return "html5" === this._api ? new self.C3Html5AudioInstance(this._audioDomHandler,this,f) : new self.C3WebAudioInstance(this._audioDomHandler,this,f)
    }
    _Load() {}
    Load() {
        this._loadPromise || (this._loadPromise = this._Load());
        return this._loadPromise
    }
    IsLoaded() {}
    IsLoadedAndDecoded() {}
    HasFailedToLoad() {
        return "failed" === this._loadState
    }
    GetAudioContext() {
        return this._audioDomHandler.GetAudioContext()
    }
    GetApi() {
        return this._api
    }
    GetOriginalUrl() {
        return this._originalUrl
    }
    GetUrl() {
        return this._url
    }
    GetContentType() {
        return this._type
    }
    IsMusic() {
        return this._isMusic
    }
    GetDuration() {}
}
;
"use strict";
self.C3Html5AudioBuffer = class extends self.C3AudioBuffer {
    constructor(f, a, b, d, h) {
        super(f, a, b, d, h);
        this._api = "html5";
        this._audioElem = new Audio;
        this._audioElem.crossOrigin = "anonymous";
        this._audioElem.autoplay = !1;
        this._audioElem.preload = "auto";
        this._loadReject = this._loadResolve = null;
        this._reachedCanPlayThrough = !1;
        this._audioElem.addEventListener("canplaythrough", ()=>this._reachedCanPlayThrough = !0);
        this._outNode = this.GetAudioContext().createGain();
        this._mediaSourceNode = null;
        this._audioElem.addEventListener("canplay", ()=>{
            this._loadResolve && (this._loadState = "loaded",
            this._loadResolve(),
            this._loadReject = this._loadResolve = null);
            !this._mediaSourceNode && this._audioElem && (this._mediaSourceNode = this.GetAudioContext().createMediaElementSource(this._audioElem),
            this._mediaSourceNode.connect(this._outNode))
        }
        );
        this.onended = null;
        this._audioElem.addEventListener("ended", ()=>{
            if (this.onended)
                this.onended()
        }
        );
        this._audioElem.addEventListener("error", m=>this._OnError(m))
    }
    Release() {
        this._audioDomHandler.ReleaseInstancesForBuffer(this);
        this._outNode.disconnect();
        this._outNode = null;
        this._mediaSourceNode.disconnect();
        this._mediaSourceNode = null;
        this._audioElem && !this._audioElem.paused && this._audioElem.pause();
        this._audioElem = this.onended = null;
        super.Release()
    }
    _Load() {
        this._loadState = "loading";
        return new Promise((f,a)=>{
            this._loadResolve = f;
            this._loadReject = a;
            this._audioElem.src = this._url
        }
        )
    }
    _OnError(f) {
        console.error(`[Construct 3] Audio '${this._url}' error: `, f);
        this._loadReject && (this._loadState = "failed",
        this._loadReject(f),
        this._loadReject = this._loadResolve = null)
    }
    IsLoaded() {
        const f = 4 <= this._audioElem.readyState;
        f && (this._reachedCanPlayThrough = !0);
        return f || this._reachedCanPlayThrough
    }
    IsLoadedAndDecoded() {
        return this.IsLoaded()
    }
    GetAudioElement() {
        return this._audioElem
    }
    GetOutputNode() {
        return this._outNode
    }
    GetDuration() {
        return this._audioElem.duration
    }
}
;
"use strict";
self.C3WebAudioBuffer = class extends self.C3AudioBuffer {
    constructor(f, a, b, d, h, m) {
        super(f, a, b, d, h);
        this._api = "webaudio";
        this._audioBuffer = this._audioData = null;
        this._needsSoftwareDecode = !!m
    }
    Release() {
        this._audioDomHandler.ReleaseInstancesForBuffer(this);
        this._audioBuffer = this._audioData = null;
        super.Release()
    }
    async _Fetch() {
        if (this._audioData)
            return this._audioData;
        var f = this._audioDomHandler.GetRuntimeInterface();
        if ("cordova" === f.GetExportType() && f.IsRelativeURL(this._url) && "file:" === location.protocol)
            this._audioData = await f.CordovaFetchLocalFileAsArrayBuffer(this._url);
        else {
            f = await fetch(this._url);
            if (!f.ok)
                throw Error(`error fetching audio data: ${f.status} ${f.statusText}`);
            this._audioData = await f.arrayBuffer()
        }
    }
    async _Decode() {
        if (this._audioBuffer)
            return this._audioBuffer;
        this._audioBuffer = await this._audioDomHandler.DecodeAudioData(this._audioData, this._needsSoftwareDecode);
        this._audioData = null
    }
    async _Load() {
        try {
            this._loadState = "loading",
            await this._Fetch(),
            await this._Decode(),
            this._loadState = "loaded"
        } catch (f) {
            this._loadState = "failed",
            console.error(`[Construct 3] Failed to load audio '${this._url}': `, f)
        }
    }
    IsLoaded() {
        return !(!this._audioData && !this._audioBuffer)
    }
    IsLoadedAndDecoded() {
        return !!this._audioBuffer
    }
    GetAudioBuffer() {
        return this._audioBuffer
    }
    GetDuration() {
        return this._audioBuffer ? this._audioBuffer.duration : 0
    }
}
;
"use strict";
{
    let f = 0;
    self.C3AudioInstance = class {
        constructor(a, b, d) {
            this._audioDomHandler = a;
            this._buffer = b;
            this._tag = d;
            this._aiId = f++;
            this._gainNode = this.GetAudioContext().createGain();
            this._gainNode.connect(this.GetDestinationNode());
            this._pannerNode = null;
            this._isPannerEnabled = !1;
            this._isStopped = !0;
            this._isLooping = this._resumeMe = this._isPaused = !1;
            this._volume = 1;
            this._isMuted = !1;
            this._playbackRate = 1;
            a = this._audioDomHandler.GetTimeScaleMode();
            this._isTimescaled = 1 === a && !this.IsMusic() || 2 === a;
            this._fadeEndTime = this._instUid = -1;
            this._stopOnFadeEnd = !1
        }
        Release() {
            this._buffer = this._audioDomHandler = null;
            this._pannerNode && (this._pannerNode.disconnect(),
            this._pannerNode = null);
            this._gainNode.disconnect();
            this._gainNode = null
        }
        GetAudioContext() {
            return this._audioDomHandler.GetAudioContext()
        }
        GetDestinationNode() {
            return this._audioDomHandler.GetDestinationForTag(this._tag)
        }
        GetMasterVolume() {
            return this._audioDomHandler.GetMasterVolume()
        }
        GetCurrentTime() {
            return this._isTimescaled ? this._audioDomHandler.GetGameTime() : performance.now() / 1E3
        }
        GetOriginalUrl() {
            return this._buffer.GetOriginalUrl()
        }
        GetUrl() {
            return this._buffer.GetUrl()
        }
        GetContentType() {
            return this._buffer.GetContentType()
        }
        GetBuffer() {
            return this._buffer
        }
        IsMusic() {
            return this._buffer.IsMusic()
        }
        SetTag(a) {
            this._tag = a
        }
        GetTag() {
            return this._tag
        }
        GetAiId() {
            return this._aiId
        }
        HasEnded() {}
        CanBeRecycled() {}
        IsPlaying() {
            return !this._isStopped && !this._isPaused && !this.HasEnded()
        }
        IsActive() {
            return !this._isStopped && !this.HasEnded()
        }
        GetPlaybackTime(a) {}
        GetDuration(a) {
            let b = this._buffer.GetDuration();
            a && (b /= this._playbackRate || .001);
            return b
        }
        Play(a, b, d, h) {}
        Stop() {}
        Pause() {}
        IsPaused() {
            return this._isPaused
        }
        Resume() {}
        SetVolume(a) {
            this._volume = a;
            this._gainNode.gain.cancelScheduledValues(0);
            this._fadeEndTime = -1;
            this._gainNode.gain.value = this.GetOverallVolume()
        }
        FadeVolume(a, b, d) {
            if (!this.IsMuted()) {
                a *= this.GetMasterVolume();
                var h = this._gainNode.gain;
                h.cancelScheduledValues(0);
                var m = this._audioDomHandler.GetAudioCurrentTime();
                b = m + b;
                h.setValueAtTime(h.value, m);
                h.linearRampToValueAtTime(a, b);
                this._volume = a;
                this._fadeEndTime = b;
                this._stopOnFadeEnd = d
            }
        }
        _UpdateVolume() {
            this.SetVolume(this._volume)
        }
        Tick(a) {
            -1 !== this._fadeEndTime && a >= this._fadeEndTime && (this._fadeEndTime = -1,
            this._stopOnFadeEnd && this.Stop(),
            this._audioDomHandler.PostTrigger("fade-ended", this._tag, this._aiId))
        }
        GetOverallVolume() {
            const a = this._volume * this.GetMasterVolume();
            return isFinite(a) ? a : 0
        }
        SetMuted(a) {
            a = !!a;
            this._isMuted !== a && (this._isMuted = a,
            this._UpdateMuted())
        }
        IsMuted() {
            return this._isMuted
        }
        IsSilent() {
            return this._audioDomHandler.IsSilent()
        }
        _UpdateMuted() {}
        SetLooping(a) {}
        IsLooping() {
            return this._isLooping
        }
        SetPlaybackRate(a) {
            this._playbackRate !== a && (this._playbackRate = a,
            this._UpdatePlaybackRate())
        }
        _UpdatePlaybackRate() {}
        GetPlaybackRate() {
            return this._playbackRate
        }
        Seek(a) {}
        SetSuspended(a) {}
        SetPannerEnabled(a) {
            a = !!a;
            this._isPannerEnabled !== a && ((this._isPannerEnabled = a) ? (this._pannerNode || (this._pannerNode = this.GetAudioContext().createPanner(),
            this._pannerNode.panningModel = this._audioDomHandler.GetPanningModel(),
            this._pannerNode.distanceModel = this._audioDomHandler.GetDistanceModel(),
            this._pannerNode.refDistance = this._audioDomHandler.GetReferenceDistance(),
            this._pannerNode.maxDistance = this._audioDomHandler.GetMaxDistance(),
            this._pannerNode.rolloffFactor = this._audioDomHandler.GetRolloffFactor()),
            this._gainNode.disconnect(),
            this._gainNode.connect(this._pannerNode),
            this._pannerNode.connect(this.GetDestinationNode())) : (this._pannerNode.disconnect(),
            this._gainNode.disconnect(),
            this._gainNode.connect(this.GetDestinationNode())))
        }
        SetPan(a, b, d, h, m, q) {
            this._isPannerEnabled && (this.SetPanXYA(a, b, d),
            a = self.AudioDOMHandler.ToDegrees,
            this._pannerNode.coneInnerAngle = a(h),
            this._pannerNode.coneOuterAngle = a(m),
            this._pannerNode.coneOuterGain = q)
        }
        SetPanXYA(a, b, d) {
            this._isPannerEnabled && (this._pannerNode.setPosition(a, b, 0),
            this._pannerNode.setOrientation(Math.cos(d), Math.sin(d), 0))
        }
        SetUID(a) {
            this._instUid = a
        }
        GetUID() {
            return this._instUid
        }
        GetResumePosition() {}
        Reconnect(a) {
            const b = this._pannerNode || this._gainNode;
            b.disconnect();
            b.connect(a)
        }
        GetState() {
            return {
                aiid: this.GetAiId(),
                tag: this._tag,
                duration: this.GetDuration(),
                volume: this._volume,
                isPlaying: this.IsPlaying(),
                playbackTime: this.GetPlaybackTime(),
                playbackRate: this.GetPlaybackRate(),
                uid: this._instUid,
                bufferOriginalUrl: this.GetOriginalUrl(),
                bufferUrl: "",
                bufferType: this.GetContentType(),
                isMusic: this.IsMusic(),
                isLooping: this.IsLooping(),
                isMuted: this.IsMuted(),
                resumePosition: this.GetResumePosition(),
                pan: this.GetPanState()
            }
        }
        _LoadAdditionalState(a) {
            this.SetPlaybackRate(a.playbackRate);
            this.SetMuted(a.isMuted)
        }
        GetPanState() {
            if (!this._pannerNode)
                return null;
            const a = this._pannerNode;
            return {
                pos: [a.positionX.value, a.positionY.value, a.positionZ.value],
                orient: [a.orientationX.value, a.orientationY.value, a.orientationZ.value],
                cia: a.coneInnerAngle,
                coa: a.coneOuterAngle,
                cog: a.coneOuterGain,
                uid: this._instUid
            }
        }
        LoadPanState(a) {
            a ? (this.SetPannerEnabled(!0),
            a = this._pannerNode,
            a.setPosition(...a.pos),
            a.setOrientation(...a.orient),
            a.coneInnerAngle = a.cia,
            a.coneOuterAngle = a.coa,
            a.coneOuterGain = a.cog,
            this._instUid = a.uid) : this.SetPannerEnabled(!1)
        }
    }
}
"use strict";
self.C3Html5AudioInstance = class extends self.C3AudioInstance {
    constructor(f, a, b) {
        super(f, a, b);
        this._buffer.GetOutputNode().connect(this._gainNode);
        this._buffer.onended = ()=>this._OnEnded()
    }
    Release() {
        this.Stop();
        this._buffer.GetOutputNode().disconnect();
        super.Release()
    }
    GetAudioElement() {
        return this._buffer.GetAudioElement()
    }
    _OnEnded() {
        this._isStopped = !0;
        this._instUid = -1;
        this._audioDomHandler.PostTrigger("ended", this._tag, this._aiId)
    }
    HasEnded() {
        return this.GetAudioElement().ended
    }
    CanBeRecycled() {
        return this._isStopped ? !0 : this.HasEnded()
    }
    GetPlaybackTime(f) {
        let a = this.GetAudioElement().currentTime;
        f && (a *= this._playbackRate);
        this._isLooping || (a = Math.min(a, this.GetDuration()));
        return a
    }
    Play(f, a, b, d) {
        d = this.GetAudioElement();
        1 !== d.playbackRate && (d.playbackRate = 1);
        d.loop !== f && (d.loop = f);
        this.SetVolume(a);
        d.muted && (d.muted = !1);
        if (d.currentTime !== b)
            try {
                d.currentTime = b
            } catch (h) {
                console.warn(`[Construct 3] Exception seeking audio '${this._buffer.GetUrl()}' to position '${b}': `, h)
            }
        this._audioDomHandler.TryPlayMedia(d);
        this._isPaused = this._isStopped = !1;
        this._isLooping = f;
        this._playbackRate = 1
    }
    Stop() {
        const f = this.GetAudioElement();
        f.paused || f.pause();
        this._audioDomHandler.RemovePendingPlay(f);
        this._isStopped = !0;
        this._isPaused = !1;
        this._instUid = -1
    }
    Pause() {
        if (!(this._isPaused || this._isStopped || this.HasEnded())) {
            var f = this.GetAudioElement();
            f.paused || f.pause();
            this._audioDomHandler.RemovePendingPlay(f);
            this._isPaused = !0
        }
    }
    Resume() {
        !this._isPaused || this._isStopped || this.HasEnded() || (this._audioDomHandler.TryPlayMedia(this.GetAudioElement()),
        this._isPaused = !1)
    }
    _UpdateMuted() {
        this.GetAudioElement().muted = this._isMuted || this.IsSilent()
    }
    SetLooping(f) {
        f = !!f;
        this._isLooping !== f && (this._isLooping = f,
        this.GetAudioElement().loop = f)
    }
    _UpdatePlaybackRate() {
        let f = this._playbackRate;
        this._isTimescaled && (f *= this._audioDomHandler.GetTimeScale());
        try {
            this.GetAudioElement().playbackRate = f
        } catch (a) {
            console.warn(`[Construct 3] Unable to set playback rate '${f}':`, a)
        }
    }
    Seek(f) {
        if (!this._isStopped && !this.HasEnded())
            try {
                this.GetAudioElement().currentTime = f
            } catch (a) {
                console.warn(`[Construct 3] Error seeking audio to '${f}': `, a)
            }
    }
    GetResumePosition() {
        return this.GetPlaybackTime()
    }
    SetSuspended(f) {
        f ? this.IsPlaying() ? (this.GetAudioElement().pause(),
        this._resumeMe = !0) : this._resumeMe = !1 : this._resumeMe && (this._audioDomHandler.TryPlayMedia(this.GetAudioElement()),
        this._resumeMe = !1)
    }
}
;
"use strict";
self.C3WebAudioInstance = class extends self.C3AudioInstance {
    constructor(f, a, b) {
        super(f, a, b);
        this._bufferSource = null;
        this._onended_handler = d=>this._OnEnded(d);
        this._hasPlaybackEnded = !0;
        this._activeSource = null;
        this._resumePosition = this._startTime = 0;
        this._muteVol = 1
    }
    Release() {
        this.Stop();
        this._ReleaseBufferSource();
        this._onended_handler = null;
        super.Release()
    }
    _ReleaseBufferSource() {
        this._bufferSource && this._bufferSource.disconnect();
        this._activeSource = this._bufferSource = null
    }
    _OnEnded(f) {
        this._isPaused || this._resumeMe || f.target !== this._activeSource || (this._isStopped = this._hasPlaybackEnded = !0,
        this._instUid = -1,
        this._ReleaseBufferSource(),
        this._audioDomHandler.PostTrigger("ended", this._tag, this._aiId))
    }
    HasEnded() {
        return !this._isStopped && this._bufferSource && this._bufferSource.loop || this._isPaused ? !1 : this._hasPlaybackEnded
    }
    CanBeRecycled() {
        return !this._bufferSource || this._isStopped ? !0 : this.HasEnded()
    }
    GetPlaybackTime(f) {
        let a;
        a = this._isPaused ? this._resumePosition : this.GetCurrentTime() - this._startTime;
        f && (a *= this._playbackRate);
        this._isLooping || (a = Math.min(a, this.GetDuration()));
        return a
    }
    Play(f, a, b, d) {
        this._muteVol = 1;
        this.SetVolume(a);
        this._ReleaseBufferSource();
        this._bufferSource = this.GetAudioContext().createBufferSource();
        this._bufferSource.buffer = this._buffer.GetAudioBuffer();
        this._bufferSource.connect(this._gainNode);
        this._activeSource = this._bufferSource;
        this._bufferSource.onended = this._onended_handler;
        this._bufferSource.loop = f;
        this._bufferSource.start(d, b);
        this._isPaused = this._isStopped = this._hasPlaybackEnded = !1;
        this._isLooping = f;
        this._playbackRate = 1;
        this._startTime = this.GetCurrentTime() - b
    }
    Stop() {
        if (this._bufferSource)
            try {
                this._bufferSource.stop(0)
            } catch (f) {}
        this._isStopped = !0;
        this._isPaused = !1;
        this._instUid = -1
    }
    Pause() {
        this._isPaused || this._isStopped || this.HasEnded() || (this._resumePosition = this.GetPlaybackTime(!0),
        this._isLooping && (this._resumePosition %= this.GetDuration()),
        this._isPaused = !0,
        this._bufferSource.stop(0))
    }
    Resume() {
        !this._isPaused || this._isStopped || this.HasEnded() || (this._ReleaseBufferSource(),
        this._bufferSource = this.GetAudioContext().createBufferSource(),
        this._bufferSource.buffer = this._buffer.GetAudioBuffer(),
        this._bufferSource.connect(this._gainNode),
        this._activeSource = this._bufferSource,
        this._bufferSource.onended = this._onended_handler,
        this._bufferSource.loop = this._isLooping,
        this._UpdateVolume(),
        this._UpdatePlaybackRate(),
        this._startTime = this.GetCurrentTime() - this._resumePosition / (this._playbackRate || .001),
        this._bufferSource.start(0, this._resumePosition),
        this._isPaused = !1)
    }
    GetOverallVolume() {
        return super.GetOverallVolume() * this._muteVol
    }
    _UpdateMuted() {
        this._muteVol = this._isMuted || this.IsSilent() ? 0 : 1;
        this._UpdateVolume()
    }
    SetLooping(f) {
        f = !!f;
        this._isLooping !== f && (this._isLooping = f,
        this._bufferSource && (this._bufferSource.loop = f))
    }
    _UpdatePlaybackRate() {
        let f = this._playbackRate;
        this._isTimescaled && (f *= this._audioDomHandler.GetTimeScale());
        this._bufferSource && (this._bufferSource.playbackRate.value = f)
    }
    Seek(f) {
        this._isStopped || this.HasEnded() || (this._isPaused ? this._resumePosition = f : (this.Pause(),
        this._resumePosition = f,
        this.Resume()))
    }
    GetResumePosition() {
        return this._resumePosition
    }
    SetSuspended(f) {
        f ? this.IsPlaying() ? (this._resumeMe = !0,
        this._resumePosition = this.GetPlaybackTime(!0),
        this._isLooping && (this._resumePosition %= this.GetDuration()),
        this._bufferSource.stop(0)) : this._resumeMe = !1 : this._resumeMe && (this._ReleaseBufferSource(),
        this._bufferSource = this.GetAudioContext().createBufferSource(),
        this._bufferSource.buffer = this._buffer.GetAudioBuffer(),
        this._bufferSource.connect(this._gainNode),
        this._activeSource = this._bufferSource,
        this._bufferSource.onended = this._onended_handler,
        this._bufferSource.loop = this._isLooping,
        this._UpdateVolume(),
        this._UpdatePlaybackRate(),
        this._startTime = this.GetCurrentTime() - this._resumePosition / (this._playbackRate || .001),
        this._bufferSource.start(0, this._resumePosition),
        this._resumeMe = !1)
    }
    _LoadAdditionalState(f) {
        super._LoadAdditionalState(f);
        this._resumePosition = f.resumePosition
    }
}
;
"use strict";
{
    class f {
        constructor(a) {
            this._audioDomHandler = a;
            this._audioContext = a.GetAudioContext();
            this._index = -1;
            this._type = this._tag = "";
            this._params = null
        }
        Release() {
            this._audioContext = null
        }
        _SetIndex(a) {
            this._index = a
        }
        GetIndex() {
            return this._index
        }
        _SetTag(a) {
            this._tag = a
        }
        GetTag() {
            return this._tag
        }
        CreateGain() {
            return this._audioContext.createGain()
        }
        GetInputNode() {}
        ConnectTo(a) {}
        SetAudioParam(a, b, d, h) {
            a.cancelScheduledValues(0);
            if (0 === h)
                a.value = b;
            else {
                var m = this._audioContext.currentTime;
                h += m;
                switch (d) {
                case 0:
                    a.setValueAtTime(b, h);
                    break;
                case 1:
                    a.setValueAtTime(a.value, m);
                    a.linearRampToValueAtTime(b, h);
                    break;
                case 2:
                    a.setValueAtTime(a.value, m),
                    a.exponentialRampToValueAtTime(b, h)
                }
            }
        }
        GetState() {
            return {
                type: this._type,
                tag: this._tag,
                params: this._params
            }
        }
    }
    self.C3AudioFilterFX = class extends f {
        constructor(a, b, d, h, m, q, n) {
            super(a);
            this._type = "filter";
            this._params = [b, d, h, m, q, n];
            this._inputNode = this.CreateGain();
            this._wetNode = this.CreateGain();
            this._wetNode.gain.value = n;
            this._dryNode = this.CreateGain();
            this._dryNode.gain.value = 1 - n;
            this._filterNode = this._audioContext.createBiquadFilter();
            this._filterNode.type = b;
            this._filterNode.frequency.value = d;
            this._filterNode.detune.value = h;
            this._filterNode.Q.value = m;
            this._filterNode.gain.vlaue = q;
            this._inputNode.connect(this._filterNode);
            this._inputNode.connect(this._dryNode);
            this._filterNode.connect(this._wetNode)
        }
        Release() {
            this._inputNode.disconnect();
            this._filterNode.disconnect();
            this._wetNode.disconnect();
            this._dryNode.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._wetNode.disconnect();
            this._wetNode.connect(a);
            this._dryNode.disconnect();
            this._dryNode.connect(a)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(a, b, d, h) {
            switch (a) {
            case 0:
                b = Math.max(Math.min(b / 100, 1), 0);
                this._params[5] = b;
                this.SetAudioParam(this._wetNode.gain, b, d, h);
                this.SetAudioParam(this._dryNode.gain, 1 - b, d, h);
                break;
            case 1:
                this._params[1] = b;
                this.SetAudioParam(this._filterNode.frequency, b, d, h);
                break;
            case 2:
                this._params[2] = b;
                this.SetAudioParam(this._filterNode.detune, b, d, h);
                break;
            case 3:
                this._params[3] = b;
                this.SetAudioParam(this._filterNode.Q, b, d, h);
                break;
            case 4:
                this._params[4] = b,
                this.SetAudioParam(this._filterNode.gain, b, d, h)
            }
        }
    }
    ;
    self.C3AudioDelayFX = class extends f {
        constructor(a, b, d, h) {
            super(a);
            this._type = "delay";
            this._params = [b, d, h];
            this._inputNode = this.CreateGain();
            this._wetNode = this.CreateGain();
            this._wetNode.gain.value = h;
            this._dryNode = this.CreateGain();
            this._dryNode.gain.value = 1 - h;
            this._mainNode = this.CreateGain();
            this._delayNode = this._audioContext.createDelay(b);
            this._delayNode.delayTime.value = b;
            this._delayGainNode = this.CreateGain();
            this._delayGainNode.gain.value = d;
            this._inputNode.connect(this._mainNode);
            this._inputNode.connect(this._dryNode);
            this._mainNode.connect(this._wetNode);
            this._mainNode.connect(this._delayNode);
            this._delayNode.connect(this._delayGainNode);
            this._delayGainNode.connect(this._mainNode)
        }
        Release() {
            this._inputNode.disconnect();
            this._wetNode.disconnect();
            this._dryNode.disconnect();
            this._mainNode.disconnect();
            this._delayNode.disconnect();
            this._delayGainNode.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._wetNode.disconnect();
            this._wetNode.connect(a);
            this._dryNode.disconnect();
            this._dryNode.connect(a)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(a, b, d, h) {
            const m = self.AudioDOMHandler.DbToLinear;
            switch (a) {
            case 0:
                b = Math.max(Math.min(b / 100, 1), 0);
                this._params[2] = b;
                this.SetAudioParam(this._wetNode.gain, b, d, h);
                this.SetAudioParam(this._dryNode.gain, 1 - b, d, h);
                break;
            case 4:
                this._params[1] = m(b);
                this.SetAudioParam(this._delayGainNode.gain, m(b), d, h);
                break;
            case 5:
                this._params[0] = b,
                this.SetAudioParam(this._delayNode.delayTime, b, d, h)
            }
        }
    }
    ;
    self.C3AudioConvolveFX = class extends f {
        constructor(a, b, d, h) {
            super(a);
            this._type = "convolution";
            this._params = [d, h];
            this._bufferType = this._bufferUrl = this._bufferOriginalUrl = "";
            this._inputNode = this.CreateGain();
            this._wetNode = this.CreateGain();
            this._wetNode.gain.value = h;
            this._dryNode = this.CreateGain();
            this._dryNode.gain.value = 1 - h;
            this._convolveNode = this._audioContext.createConvolver();
            this._convolveNode.normalize = d;
            this._convolveNode.buffer = b;
            this._inputNode.connect(this._convolveNode);
            this._inputNode.connect(this._dryNode);
            this._convolveNode.connect(this._wetNode)
        }
        Release() {
            this._inputNode.disconnect();
            this._convolveNode.disconnect();
            this._wetNode.disconnect();
            this._dryNode.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._wetNode.disconnect();
            this._wetNode.connect(a);
            this._dryNode.disconnect();
            this._dryNode.connect(a)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(a, b, d, h) {
            switch (a) {
            case 0:
                b = Math.max(Math.min(b / 100, 1), 0),
                this._params[1] = b,
                this.SetAudioParam(this._wetNode.gain, b, d, h),
                this.SetAudioParam(this._dryNode.gain, 1 - b, d, h)
            }
        }
        _SetBufferInfo(a, b, d) {
            this._bufferOriginalUrl = a;
            this._bufferUrl = b;
            this._bufferType = d
        }
        GetState() {
            const a = super.GetState();
            a.bufferOriginalUrl = this._bufferOriginalUrl;
            a.bufferUrl = "";
            a.bufferType = this._bufferType;
            return a
        }
    }
    ;
    self.C3AudioFlangerFX = class extends f {
        constructor(a, b, d, h, m, q) {
            super(a);
            this._type = "flanger";
            this._params = [b, d, h, m, q];
            this._inputNode = this.CreateGain();
            this._dryNode = this.CreateGain();
            this._dryNode.gain.value = 1 - q / 2;
            this._wetNode = this.CreateGain();
            this._wetNode.gain.value = q / 2;
            this._feedbackNode = this.CreateGain();
            this._feedbackNode.gain.value = m;
            this._delayNode = this._audioContext.createDelay(b + d);
            this._delayNode.delayTime.value = b;
            this._oscNode = this._audioContext.createOscillator();
            this._oscNode.frequency.value = h;
            this._oscGainNode = this.CreateGain();
            this._oscGainNode.gain.value = d;
            this._inputNode.connect(this._delayNode);
            this._inputNode.connect(this._dryNode);
            this._delayNode.connect(this._wetNode);
            this._delayNode.connect(this._feedbackNode);
            this._feedbackNode.connect(this._delayNode);
            this._oscNode.connect(this._oscGainNode);
            this._oscGainNode.connect(this._delayNode.delayTime);
            this._oscNode.start(0)
        }
        Release() {
            this._oscNode.stop(0);
            this._inputNode.disconnect();
            this._delayNode.disconnect();
            this._oscNode.disconnect();
            this._oscGainNode.disconnect();
            this._dryNode.disconnect();
            this._wetNode.disconnect();
            this._feedbackNode.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._wetNode.disconnect();
            this._wetNode.connect(a);
            this._dryNode.disconnect();
            this._dryNode.connect(a)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(a, b, d, h) {
            switch (a) {
            case 0:
                b = Math.max(Math.min(b / 100, 1), 0);
                this._params[4] = b;
                this.SetAudioParam(this._wetNode.gain, b / 2, d, h);
                this.SetAudioParam(this._dryNode.gain, 1 - b / 2, d, h);
                break;
            case 6:
                this._params[1] = b / 1E3;
                this.SetAudioParam(this._oscGainNode.gain, b / 1E3, d, h);
                break;
            case 7:
                this._params[2] = b;
                this.SetAudioParam(this._oscNode.frequency, b, d, h);
                break;
            case 8:
                this._params[3] = b / 100,
                this.SetAudioParam(this._feedbackNode.gain, b / 100, d, h)
            }
        }
    }
    ;
    self.C3AudioPhaserFX = class extends f {
        constructor(a, b, d, h, m, q, n) {
            super(a);
            this._type = "phaser";
            this._params = [b, d, h, m, q, n];
            this._inputNode = this.CreateGain();
            this._dryNode = this.CreateGain();
            this._dryNode.gain.value = 1 - n / 2;
            this._wetNode = this.CreateGain();
            this._wetNode.gain.value = n / 2;
            this._filterNode = this._audioContext.createBiquadFilter();
            this._filterNode.type = "allpass";
            this._filterNode.frequency.value = b;
            this._filterNode.detune.value = d;
            this._filterNode.Q.value = h;
            this._oscNode = this._audioContext.createOscillator();
            this._oscNode.frequency.value = q;
            this._oscGainNode = this.CreateGain();
            this._oscGainNode.gain.value = m;
            this._inputNode.connect(this._filterNode);
            this._inputNode.connect(this._dryNode);
            this._filterNode.connect(this._wetNode);
            this._oscNode.connect(this._oscGainNode);
            this._oscGainNode.connect(this._filterNode.frequency);
            this._oscNode.start(0)
        }
        Release() {
            this._oscNode.stop(0);
            this._inputNode.disconnect();
            this._filterNode.disconnect();
            this._oscNode.disconnect();
            this._oscGainNode.disconnect();
            this._dryNode.disconnect();
            this._wetNode.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._wetNode.disconnect();
            this._wetNode.connect(a);
            this._dryNode.disconnect();
            this._dryNode.connect(a)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(a, b, d, h) {
            switch (a) {
            case 0:
                b = Math.max(Math.min(b / 100, 1), 0);
                this._params[5] = b;
                this.SetAudioParam(this._wetNode.gain, b / 2, d, h);
                this.SetAudioParam(this._dryNode.gain, 1 - b / 2, d, h);
                break;
            case 1:
                this._params[0] = b;
                this.SetAudioParam(this._filterNode.frequency, b, d, h);
                break;
            case 2:
                this._params[1] = b;
                this.SetAudioParam(this._filterNode.detune, b, d, h);
                break;
            case 3:
                this._params[2] = b;
                this.SetAudioParam(this._filterNode.Q, b, d, h);
                break;
            case 6:
                this._params[3] = b;
                this.SetAudioParam(this._oscGainNode.gain, b, d, h);
                break;
            case 7:
                this._params[4] = b,
                this.SetAudioParam(this._oscNode.frequency, b, d, h)
            }
        }
    }
    ;
    self.C3AudioGainFX = class extends f {
        constructor(a, b) {
            super(a);
            this._type = "gain";
            this._params = [b];
            this._node = this.CreateGain();
            this._node.gain.value = b
        }
        Release() {
            this._node.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._node.disconnect();
            this._node.connect(a)
        }
        GetInputNode() {
            return this._node
        }
        SetParam(a, b, d, h) {
            const m = self.AudioDOMHandler.DbToLinear;
            switch (a) {
            case 4:
                this._params[0] = m(b),
                this.SetAudioParam(this._node.gain, m(b), d, h)
            }
        }
    }
    ;
    self.C3AudioTremoloFX = class extends f {
        constructor(a, b, d) {
            super(a);
            this._type = "tremolo";
            this._params = [b, d];
            this._node = this.CreateGain();
            this._node.gain.value = 1 - d / 2;
            this._oscNode = this._audioContext.createOscillator();
            this._oscNode.frequency.value = b;
            this._oscGainNode = this.CreateGain();
            this._oscGainNode.gain.value = d / 2;
            this._oscNode.connect(this._oscGainNode);
            this._oscGainNode.connect(this._node.gain);
            this._oscNode.start(0)
        }
        Release() {
            this._oscNode.stop(0);
            this._oscNode.disconnect();
            this._oscGainNode.disconnect();
            this._node.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._node.disconnect();
            this._node.connect(a)
        }
        GetInputNode() {
            return this._node
        }
        SetParam(a, b, d, h) {
            switch (a) {
            case 0:
                b = Math.max(Math.min(b / 100, 1), 0);
                this._params[1] = b;
                this.SetAudioParam(this._node.gain.value, 1 - b / 2, d, h);
                this.SetAudioParam(this._oscGainNode.gain.value, b / 2, d, h);
                break;
            case 7:
                this._params[0] = b,
                this.SetAudioParam(this._oscNode.frequency, b, d, h)
            }
        }
    }
    ;
    self.C3AudioRingModFX = class extends f {
        constructor(a, b, d) {
            super(a);
            this._type = "ringmod";
            this._params = [b, d];
            this._inputNode = this.CreateGain();
            this._wetNode = this.CreateGain();
            this._wetNode.gain.value = d;
            this._dryNode = this.CreateGain();
            this._dryNode.gain.value = 1 - d;
            this._ringNode = this.CreateGain();
            this._ringNode.gain.value = 0;
            this._oscNode = this._audioContext.createOscillator();
            this._oscNode.frequency.value = b;
            this._oscNode.connect(this._ringNode.gain);
            this._oscNode.start(0);
            this._inputNode.connect(this._ringNode);
            this._inputNode.connect(this._dryNode);
            this._ringNode.connect(this._wetNode)
        }
        Release() {
            this._oscNode.stop(0);
            this._oscNode.disconnect();
            this._ringNode.disconnect();
            this._inputNode.disconnect();
            this._wetNode.disconnect();
            this._dryNode.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._wetNode.disconnect();
            this._wetNode.connect(a);
            this._dryNode.disconnect();
            this._dryNode.connect(a)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(a, b, d, h) {
            switch (a) {
            case 0:
                b = Math.max(Math.min(b / 100, 1), 0);
                this._params[1] = b;
                this.SetAudioParam(this._wetNode.gain, b, d, h);
                this.SetAudioParam(this._dryNode.gain, 1 - b, d, h);
                break;
            case 7:
                this._params[0] = b,
                this.SetAudioParam(this._oscNode.frequency, b, d, h)
            }
        }
    }
    ;
    self.C3AudioDistortionFX = class extends f {
        constructor(a, b, d, h, m, q) {
            super(a);
            this._type = "distortion";
            this._params = [b, d, h, m, q];
            this._inputNode = this.CreateGain();
            this._preGain = this.CreateGain();
            this._postGain = this.CreateGain();
            this._SetDrive(h, m);
            this._wetNode = this.CreateGain();
            this._wetNode.gain.value = q;
            this._dryNode = this.CreateGain();
            this._dryNode.gain.value = 1 - q;
            this._waveShaper = this._audioContext.createWaveShaper();
            this._curve = new Float32Array(65536);
            this._GenerateColortouchCurve(b, d);
            this._waveShaper.curve = this._curve;
            this._inputNode.connect(this._preGain);
            this._inputNode.connect(this._dryNode);
            this._preGain.connect(this._waveShaper);
            this._waveShaper.connect(this._postGain);
            this._postGain.connect(this._wetNode)
        }
        Release() {
            this._inputNode.disconnect();
            this._preGain.disconnect();
            this._waveShaper.disconnect();
            this._postGain.disconnect();
            this._wetNode.disconnect();
            this._dryNode.disconnect();
            super.Release()
        }
        _SetDrive(a, b) {
            .01 > a && (a = .01);
            this._preGain.gain.value = a;
            this._postGain.gain.value = Math.pow(1 / a, .6) * b
        }
        _GenerateColortouchCurve(a, b) {
            for (let d = 0; 32768 > d; ++d) {
                let h = d / 32768;
                h = this._Shape(h, a, b);
                this._curve[32768 + d] = h;
                this._curve[32768 - d - 1] = -h
            }
        }
        _Shape(a, b, d) {
            d = 1.05 * d * b - b;
            const h = 0 > a ? -1 : 1;
            a = 0 > a ? -a : a;
            return (a < b ? a : b + d * self.AudioDOMHandler.e4(a - b, 1 / d)) * h
        }
        ConnectTo(a) {
            this._wetNode.disconnect();
            this._wetNode.connect(a);
            this._dryNode.disconnect();
            this._dryNode.connect(a)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(a, b, d, h) {
            switch (a) {
            case 0:
                b = Math.max(Math.min(b / 100, 1), 0),
                this._params[4] = b,
                this.SetAudioParam(this._wetNode.gain, b, d, h),
                this.SetAudioParam(this._dryNode.gain, 1 - b, d, h)
            }
        }
    }
    ;
    self.C3AudioCompressorFX = class extends f {
        constructor(a, b, d, h, m, q) {
            super(a);
            this._type = "compressor";
            this._params = [b, d, h, m, q];
            this._node = this._audioContext.createDynamicsCompressor();
            this._node.threshold.value = b;
            this._node.knee.value = d;
            this._node.ratio.value = h;
            this._node.attack.value = m;
            this._node.release.value = q
        }
        Release() {
            this._node.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._node.disconnect();
            this._node.connect(a)
        }
        GetInputNode() {
            return this._node
        }
        SetParam(a, b, d, h) {}
    }
    ;
    self.C3AudioAnalyserFX = class extends f {
        constructor(a, b, d) {
            super(a);
            this._type = "analyser";
            this._params = [b, d];
            this._node = this._audioContext.createAnalyser();
            this._node.fftSize = b;
            this._node.smoothingTimeConstant = d;
            this._freqBins = new Float32Array(this._node.frequencyBinCount);
            this._signal = new Uint8Array(b);
            this._rms = this._peak = 0;
            this._audioDomHandler._AddAnalyser(this)
        }
        Release() {
            this._audioDomHandler._RemoveAnalyser(this);
            this._node.disconnect();
            super.Release()
        }
        Tick() {
            this._node.getFloatFrequencyData(this._freqBins);
            this._node.getByteTimeDomainData(this._signal);
            const a = this._node.fftSize;
            let b = this._peak = 0;
            for (var d = 0; d < a; ++d) {
                let h = (this._signal[d] - 128) / 128;
                0 > h && (h = -h);
                this._peak < h && (this._peak = h);
                b += h * h
            }
            d = self.AudioDOMHandler.LinearToDb;
            this._peak = d(this._peak);
            this._rms = d(Math.sqrt(b / a))
        }
        ConnectTo(a) {
            this._node.disconnect();
            this._node.connect(a)
        }
        GetInputNode() {
            return this._node
        }
        SetParam(a, b, d, h) {}
        GetData() {
            return {
                tag: this.GetTag(),
                index: this.GetIndex(),
                peak: this._peak,
                rms: this._rms,
                binCount: this._node.frequencyBinCount,
                freqBins: this._freqBins
            }
        }
    }
}
"use strict";
self.RuntimeInterface.AddDOMHandlerClass(class extends self.DOMHandler {
    constructor(f) {
        super(f, "touch");
        this.AddRuntimeMessageHandler("request-permission", a=>this._OnRequestPermission(a))
    }
    async _OnRequestPermission(f) {
        f = f.type;
        let a = !0;
        0 === f ? a = await this._RequestOrientationPermission() : 1 === f && (a = await this._RequestMotionPermission());
        this.PostToRuntime("permission-result", {
            type: f,
            result: a
        })
    }
    async _RequestOrientationPermission() {
        if (!self.DeviceOrientationEvent || !self.DeviceOrientationEvent.requestPermission)
            return !0;
        try {
            return "granted" === await self.DeviceOrientationEvent.requestPermission()
        } catch (f) {
            return console.warn("[Touch] Failed to request orientation permission: ", f),
            !1
        }
    }
    async _RequestMotionPermission() {
        if (!self.DeviceMotionEvent || !self.DeviceMotionEvent.requestPermission)
            return !0;
        try {
            return "granted" === await self.DeviceMotionEvent.requestPermission()
        } catch (f) {
            return console.warn("[Touch] Failed to request motion permission: ", f),
            !1
        }
    }
}
);
"use strict";
{
    let f = !1;
    {
        const a = (n,t)=>{}
          , b = n=>new Promise(t=>setTimeout(t, n));
        let d = null
          , h = null
          , m = null;
        function q(n, t) {
            const v = t.slice(0, -1);
            t = t[t.length - 1];
            console.log(n, v);
            return [v, t]
        }
        a("CreateBannerAdvert", async(...n)=>{
            [,n] = q("CreateBannerAdvert", n);
            await b(50);
            d ? n("Banner already exists") : (d = "ready",
            n(null, "Created banner"))
        }
        );
        a("ShowBannerAdvert", async(...n)=>{
            [,n] = q("ShowBannerAdvert", n);
            await b(50);
            "ready" != d ? n("Banner cannot be shown") : (d = "shown",
            n(null, "Showed banner"))
        }
        );
        a("HideBannerAdvert", async(...n)=>{
            [,n] = q("HideBannerAdvert", n);
            await b(50);
            "shown" != d ? n("Banner cannot be hidden") : (d = null,
            n(null, "Hid banner"))
        }
        );
        a("CreateInterstitialAdvert", async(...n)=>{
            [,n] = q("CreateInterstitialAdvert", n);
            await b(50);
            h ? n("Intersitial already exists") : (h = "ready",
            n(null, "Created interstitial"))
        }
        );
        a("ShowInterstitialAdvert", async(...n)=>{
            [,n] = q("ShowInterstitialAdvert", n);
            await b(50);
            "ready" != h ? n("Cannot show interstitial") : (h = null,
            n(null, "Interstitial shown"))
        }
        );
        a("CreateVideoAdvert", async(...n)=>{
            [,n] = q("CreateVideoAdvert", n);
            await b(50);
            m ? n("Video already exists") : (m = "ready",
            n(null, "Created video"))
        }
        );
        a("ShowVideoAdvert", async(...n)=>{
            [,n] = q("ShowVideoAdvert", n);
            await b(50);
            "ready" != m ? n("Cannot show video") : (m = null,
            n(null, '["example type", 20]'))
        }
        );
        a("Configure", async(...n)=>{
            [,n] = q("Configure", n);
            await b(50);
            n(null, "PERSONALIZED_true")
        }
        );
        a("RequestConsent", async(...n)=>{
            [,n] = q("RequestConsent", n);
            await b(50);
            n(null, "PERSONALIZED_true")
        }
        );
        a("SetUserPersonalisation", async(...n)=>{
            const [t,v] = q("SetUserPersonalisation", n);
            await b(50);
            v(null, t[0] + "_true")
        }
        );
        a("RequestIDFA", async(...n)=>{
            [,n] = q("RequestIDFA", n);
            await b(50);
            n(null, "authorized")
        }
        )
    }
    self.RuntimeInterface.AddDOMHandlerClass(class extends self.DOMHandler {
        constructor(a) {
            super(a, "advert");
            a = b=>[b, d=>this._CallMethod(b, d)];
            this.AddRuntimeMessageHandlers([a("CreateBannerAdvert"), a("ShowBannerAdvert"), a("HideBannerAdvert"), a("CreateInterstitialAdvert"), a("ShowInterstitialAdvert"), a("CreateVideoAdvert"), a("ShowVideoAdvert"), a("Configure"), a("RequestConsent"), a("SetUserPersonalisation"), a("SetMaxAdContentRating"), a("TagForChildDirectedTreatment"), a("TagForUnderAgeOfConsent"), a("RequestIDFA")])
        }
        _GetPlugin() {
            if (window.cordova)
                return window.cordova.plugins.ConstructAd
        }
        async _CallMethod(a, b) {
            const d = this._GetPlugin();
            if (!d)
                throw f || (f = !0,
                console.warn("The Mobile Advert plugin is not loaded. Please note that it only works in Android or iOS exports")),
                Error("advert plugin not loaded");
            return new Promise((h,m)=>{
                d[a](...b, (q,n)=>{
                    q ? m(q) : h(n)
                }
                )
            }
            )
        }
    }
    )
}
"use strict";
{
    function f() {
        const a = self.RealFile || self.File;
        return "function" === typeof navigator.canShare && navigator.canShare({
            files: [new a(["test file"],"test.txt",{})]
        })
    }
    self.RuntimeInterface.AddDOMHandlerClass(class extends self.DOMHandler {
        constructor(a) {
            super(a, "share");
            a = !!this._GetSharePlugin();
            this._isSupported = (this._isWebShareSupported = "function" === typeof navigator.share) || a;
            this._isFilesSupported = (this._isWebShareFilesSupported = f()) || a;
            this.AddRuntimeMessageHandlers([["init", b=>this._OnInit(b)], ["share", b=>this._OnShare(b)], ["request-rate", b=>this._OnRateApp(b)], ["request-store", b=>this._OnShowStore(b)]])
        }
        _OnInit() {
            return {
                isSupported: this._isSupported,
                isFilesSupported: this._isFilesSupported
            }
        }
        _GetSharePlugin() {
            return window.plugins && window.plugins.socialsharing
        }
        _GetRatePlugin() {
            return window.cordova && window.cordova.plugins && window.cordova.plugins.RateApp
        }
        async _OnShare(a) {
            var b = a.text;
            const d = a.title
              , h = a.url;
            a = a.files.slice(0);
            const m = 0 < a.length
              , q = this._GetSharePlugin();
            if (q) {
                const t = {};
                b && (t.message = b);
                d && (t.subject = d);
                h && (t.url = h);
                if (m) {
                    b = 0;
                    for (var n of a)
                        b += n.size;
                    try {
                        const v = await this._CordovaGetTempDirEntry(Math.floor(1.25 * b));
                        t.files = await Promise.all(a.map(w=>this._CordovaWriteTempFile(w, v)))
                    } catch (v) {
                        console.log("[Share plugin] Share failed: ", v);
                        this.PostToRuntime("share-failed");
                        return
                    }
                }
                q.shareWithOptions(t, ()=>{
                    this.PostToRuntime("share-completed")
                }
                , v=>{
                    console.log("[Share plugin] Share failed: ", v);
                    this.PostToRuntime("share-failed")
                }
                )
            } else {
                n = {};
                b && (n.text = b);
                d && (n.title = d);
                h && (n.url = h);
                m && (n.files = a);
                try {
                    await navigator.share(n),
                    this.PostToRuntime("share-completed")
                } catch (t) {
                    console.log("[Share plugin] Share failed: ", t),
                    this.PostToRuntime("share-failed")
                }
            }
        }
        _OnRateApp(a) {
            const b = a.body
              , d = a.confirm
              , h = a.cancel;
            a = a.appID;
            const m = this._GetRatePlugin();
            m && m.Rate(b, d, h, a)
        }
        _OnShowStore(a) {
            a = a.appID;
            const b = this._GetRatePlugin();
            b && b.Store(a)
        }
        _CordovaGetTempDirEntry(a) {
            return new Promise((b,d)=>{
                window.requestFileSystem(window.TEMPORARY, a, h=>b(h.root), d)
            }
            )
        }
        _CordovaWriteTempFile(a, b) {
            return new Promise((d,h)=>{
                b.getFile(a.name, {
                    create: !0,
                    exclusive: !1
                }, m=>{
                    const q = m.toURL();
                    m.createWriter(n=>{
                        n.onwriteend = ()=>d(q);
                        n.onerror = h;
                        n.write(a)
                    }
                    )
                }
                , h)
            }
            )
        }
    }
    )
}
;