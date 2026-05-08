'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import './liquid-ether.css';

export interface LiquidEtherProps {
  mouseForce?: number;
  cursorSize?: number;
  isViscous?: boolean;
  viscous?: number;
  iterationsViscous?: number;
  iterationsPoisson?: number;
  dt?: number;
  BFECC?: boolean;
  resolution?: number;
  isBounce?: boolean;
  colors?: string[];
  style?: React.CSSProperties;
  className?: string;
  autoDemo?: boolean;
  autoSpeed?: number;
  autoIntensity?: number;
  takeoverDuration?: number;
  autoResumeDelay?: number;
  autoRampDuration?: number;
}

interface SimOptions {
  iterations_poisson: number;
  iterations_viscous: number;
  mouse_force: number;
  resolution: number;
  cursor_size: number;
  viscous: number;
  isBounce: boolean;
  dt: number;
  isViscous: boolean;
  BFECC: boolean;
}

interface LiquidEtherWebGL {
  output?: { simulation?: { options: SimOptions; resize: () => void } };
  autoDriver?: {
    enabled: boolean;
    speed: number;
    resumeDelay: number;
    rampDurationMs: number;
    mouse?: { autoIntensity: number; takeoverDuration: number };
    forceStop: () => void;
  };
  resize: () => void;
  start: () => void;
  pause: () => void;
  dispose: () => void;
}

const defaultColors = ['#D9FF3C', '#0B1A0F', '#1A2E1F'];

export default function LiquidEther({
  mouseForce = 20,
  cursorSize = 100,
  isViscous = false,
  viscous = 30,
  iterationsViscous = 32,
  iterationsPoisson = 32,
  dt = 0.014,
  BFECC = true,
  resolution = 0.5,
  isBounce = false,
  colors = defaultColors,
  style = {},
  className = '',
  autoDemo = true,
  autoSpeed = 0.5,
  autoIntensity = 2.2,
  takeoverDuration = 0.25,
  autoResumeDelay = 1000,
  autoRampDuration = 0.6,
}: LiquidEtherProps): React.ReactElement {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const webglRef = useRef<LiquidEtherWebGL | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const rafRef = useRef<number | null>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const isVisibleRef = useRef<boolean>(true);
  const resizeRafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    function makePaletteTexture(stops: string[]): THREE.DataTexture {
      let arr: string[];
      if (Array.isArray(stops) && stops.length > 0) {
        arr = stops.length === 1 ? [stops[0], stops[0]] : stops;
      } else {
        arr = ['#ffffff', '#ffffff'];
      }
      const w = arr.length;
      const data = new Uint8Array(w * 4);
      for (let i = 0; i < w; i++) {
        const c = new THREE.Color(arr[i]);
        data[i * 4 + 0] = Math.round(c.r * 255);
        data[i * 4 + 1] = Math.round(c.g * 255);
        data[i * 4 + 2] = Math.round(c.b * 255);
        data[i * 4 + 3] = 255;
      }
      const tex = new THREE.DataTexture(data, w, 1, THREE.RGBAFormat);
      tex.magFilter = THREE.LinearFilter;
      tex.minFilter = THREE.LinearFilter;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
      return tex;
    }

    const paletteTex = makePaletteTexture(colors);
    const bgVec4 = new THREE.Vector4(0, 0, 0, 0);

    class CommonClass {
      width = 0; height = 0; aspect = 1; pixelRatio = 1;
      fboWidth: number | null = null; fboHeight: number | null = null;
      time = 0; delta = 0;
      container: HTMLElement | null = null;
      renderer: THREE.WebGLRenderer | null = null;
      clock: THREE.Clock | null = null;
      init(container: HTMLElement) {
        this.container = container;
        this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        this.resize();
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.autoClear = false;
        this.renderer.setClearColor(new THREE.Color(0x000000), 0);
        this.renderer.setPixelRatio(this.pixelRatio);
        this.renderer.setSize(this.width, this.height);
        const el = this.renderer.domElement;
        el.style.width = '100%'; el.style.height = '100%'; el.style.display = 'block';
        this.clock = new THREE.Clock(); this.clock.start();
      }
      resize() {
        if (!this.container) return;
        const rect = this.container.getBoundingClientRect();
        this.width = Math.max(1, Math.floor(rect.width));
        this.height = Math.max(1, Math.floor(rect.height));
        this.aspect = this.width / this.height;
        if (this.renderer) this.renderer.setSize(this.width, this.height, false);
      }
      update() { if (!this.clock) return; this.delta = this.clock.getDelta(); this.time += this.delta; }
    }
    const Common = new CommonClass();

    class MouseClass {
      mouseMoved = false; coords = new THREE.Vector2(); coords_old = new THREE.Vector2();
      diff = new THREE.Vector2(); timer: number | null = null; container: HTMLElement | null = null;
      docTarget: Document | null = null; listenerTarget: Window | null = null;
      isHoverInside = false; hasUserControl = false; isAutoActive = false;
      autoIntensity = 2.0; takeoverActive = false; takeoverStartTime = 0; takeoverDuration = 0.25;
      takeoverFrom = new THREE.Vector2(); takeoverTo = new THREE.Vector2();
      onInteract: (() => void) | null = null;
      private _onMM = this._mm.bind(this); private _onTS = this._ts.bind(this);
      private _onTM = this._tm.bind(this); private _onTE = this._te.bind(this);
      private _onDL = this._dl.bind(this);
      init(c: HTMLElement) {
        this.container = c; this.docTarget = c.ownerDocument || null;
        const dv = this.docTarget?.defaultView || (typeof window !== 'undefined' ? window : null);
        if (!dv) return; this.listenerTarget = dv;
        dv.addEventListener('mousemove', this._onMM);
        dv.addEventListener('touchstart', this._onTS, { passive: true });
        dv.addEventListener('touchmove', this._onTM, { passive: true });
        dv.addEventListener('touchend', this._onTE);
        this.docTarget?.addEventListener('mouseleave', this._onDL);
      }
      dispose() {
        this.listenerTarget?.removeEventListener('mousemove', this._onMM);
        this.listenerTarget?.removeEventListener('touchstart', this._onTS);
        this.listenerTarget?.removeEventListener('touchmove', this._onTM);
        this.listenerTarget?.removeEventListener('touchend', this._onTE);
        this.docTarget?.removeEventListener('mouseleave', this._onDL);
        this.listenerTarget = null; this.docTarget = null; this.container = null;
      }
      private _inside(cx: number, cy: number) {
        if (!this.container) return false;
        const r = this.container.getBoundingClientRect();
        return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
      }
      private _hover(cx: number, cy: number) { this.isHoverInside = this._inside(cx, cy); return this.isHoverInside; }
      setCoords(x: number, y: number) {
        if (!this.container) return; if (this.timer) window.clearTimeout(this.timer);
        const r = this.container.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        this.coords.set(((x - r.left) / r.width) * 2 - 1, -(((y - r.top) / r.height) * 2 - 1));
        this.mouseMoved = true; this.timer = window.setTimeout(() => { this.mouseMoved = false; }, 100);
      }
      setNormalized(nx: number, ny: number) { this.coords.set(nx, ny); this.mouseMoved = true; }
      private _mm(e: MouseEvent) {
        if (!this._hover(e.clientX, e.clientY)) return;
        if (this.onInteract) this.onInteract();
        if (this.isAutoActive && !this.hasUserControl && !this.takeoverActive) {
          if (!this.container) return; const r = this.container.getBoundingClientRect();
          this.takeoverFrom.copy(this.coords);
          this.takeoverTo.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
          this.takeoverStartTime = performance.now(); this.takeoverActive = true;
          this.hasUserControl = true; this.isAutoActive = false; return;
        }
        this.setCoords(e.clientX, e.clientY); this.hasUserControl = true;
      }
      private _ts(e: TouchEvent) {
        if (e.touches.length !== 1) return; const t = e.touches[0];
        if (!this._hover(t.clientX, t.clientY)) return;
        if (this.onInteract) this.onInteract(); this.setCoords(t.clientX, t.clientY); this.hasUserControl = true;
      }
      private _tm(e: TouchEvent) {
        if (e.touches.length !== 1) return; const t = e.touches[0];
        if (!this._hover(t.clientX, t.clientY)) return;
        if (this.onInteract) this.onInteract(); this.setCoords(t.clientX, t.clientY);
      }
      private _te() { this.isHoverInside = false; }
      private _dl() { this.isHoverInside = false; }
      update() {
        if (this.takeoverActive) {
          const t = (performance.now() - this.takeoverStartTime) / (this.takeoverDuration * 1000);
          if (t >= 1) { this.takeoverActive = false; this.coords.copy(this.takeoverTo); this.coords_old.copy(this.coords); this.diff.set(0, 0); }
          else { const k = t * t * (3 - 2 * t); this.coords.copy(this.takeoverFrom).lerp(this.takeoverTo, k); }
        }
        this.diff.subVectors(this.coords, this.coords_old); this.coords_old.copy(this.coords);
        if (this.coords_old.x === 0 && this.coords_old.y === 0) this.diff.set(0, 0);
        if (this.isAutoActive && !this.takeoverActive) this.diff.multiplyScalar(this.autoIntensity);
      }
    }
    const Mouse = new MouseClass();

    class AutoDriver {
      mouse: MouseClass; manager: any; enabled: boolean; speed: number; resumeDelay: number; rampDurationMs: number;
      active = false; current = new THREE.Vector2(0, 0); target = new THREE.Vector2();
      lastTime = performance.now(); activationTime = 0; margin = 0.2;
      private _d = new THREE.Vector2();
      constructor(m: MouseClass, mgr: any, o: any) {
        this.mouse = m; this.manager = mgr; this.enabled = o.enabled; this.speed = o.speed;
        this.resumeDelay = o.resumeDelay || 3000; this.rampDurationMs = (o.rampDuration || 0) * 1000;
        this.pickNewTarget();
      }
      pickNewTarget() { this.target.set((Math.random() * 2 - 1) * (1 - this.margin), (Math.random() * 2 - 1) * (1 - this.margin)); }
      forceStop() { this.active = false; this.mouse.isAutoActive = false; }
      update() {
        if (!this.enabled) return;
        const now = performance.now(); const idle = now - this.manager.lastUserInteraction;
        if (idle < this.resumeDelay) { if (this.active) this.forceStop(); return; }
        if (this.mouse.isHoverInside) { if (this.active) this.forceStop(); return; }
        if (!this.active) { this.active = true; this.current.copy(this.mouse.coords); this.lastTime = now; this.activationTime = now; }
        this.mouse.isAutoActive = true;
        let dtSec = (now - this.lastTime) / 1000; this.lastTime = now; if (dtSec > 0.2) dtSec = 0.016;
        const dir = this._d.subVectors(this.target, this.current); const dist = dir.length();
        if (dist < 0.01) { this.pickNewTarget(); return; }
        dir.normalize();
        let ramp = 1;
        if (this.rampDurationMs > 0) { const t = Math.min(1, (now - this.activationTime) / this.rampDurationMs); ramp = t * t * (3 - 2 * t); }
        this.current.addScaledVector(dir, Math.min(this.speed * dtSec * ramp, dist));
        this.mouse.setNormalized(this.current.x, this.current.y);
      }
    }

    // ── GLSL Shaders ──
    const face_vert = `attribute vec3 position;uniform vec2 px;uniform vec2 boundarySpace;varying vec2 uv;precision highp float;void main(){vec3 pos=position;vec2 scale=1.0-boundarySpace*2.0;pos.xy=pos.xy*scale;uv=vec2(0.5)+(pos.xy)*0.5;gl_Position=vec4(pos,1.0);}`;
    const line_vert = `attribute vec3 position;uniform vec2 px;precision highp float;varying vec2 uv;void main(){vec3 pos=position;uv=0.5+pos.xy*0.5;vec2 n=sign(pos.xy);pos.xy=abs(pos.xy)-px*1.0;pos.xy*=n;gl_Position=vec4(pos,1.0);}`;
    const mouse_vert = `precision highp float;attribute vec3 position;attribute vec2 uv;uniform vec2 center;uniform vec2 scale;uniform vec2 px;varying vec2 vUv;void main(){vec2 pos=position.xy*scale*2.0*px+center;vUv=uv;gl_Position=vec4(pos,0.0,1.0);}`;
    const advection_frag = `precision highp float;uniform sampler2D velocity;uniform float dt;uniform bool isBFECC;uniform vec2 fboSize;uniform vec2 px;varying vec2 uv;void main(){vec2 ratio=max(fboSize.x,fboSize.y)/fboSize;if(isBFECC==false){vec2 vel=texture2D(velocity,uv).xy;vec2 uv2=uv-vel*dt*ratio;vec2 nv=texture2D(velocity,uv2).xy;gl_FragColor=vec4(nv,0.0,0.0);}else{vec2 sn=uv;vec2 vo=texture2D(velocity,uv).xy;vec2 so=sn-vo*dt*ratio;vec2 vn1=texture2D(velocity,so).xy;vec2 sn2=so+vn1*dt*ratio;vec2 err=sn2-sn;vec2 sn3=sn-err/2.0;vec2 v2=texture2D(velocity,sn3).xy;vec2 so2=sn3-v2*dt*ratio;vec2 nv2=texture2D(velocity,so2).xy;gl_FragColor=vec4(nv2,0.0,0.0);}}`;
    const color_frag = `precision highp float;uniform sampler2D velocity;uniform sampler2D palette;uniform vec4 bgColor;varying vec2 uv;void main(){vec2 vel=texture2D(velocity,uv).xy;float lenv=clamp(length(vel),0.0,1.0);vec3 c=texture2D(palette,vec2(lenv,0.5)).rgb;vec3 outRGB=mix(bgColor.rgb,c,lenv);float outA=mix(bgColor.a,1.0,lenv);gl_FragColor=vec4(outRGB,outA);}`;
    const divergence_frag = `precision highp float;uniform sampler2D velocity;uniform float dt;uniform vec2 px;varying vec2 uv;void main(){float x0=texture2D(velocity,uv-vec2(px.x,0.0)).x;float x1=texture2D(velocity,uv+vec2(px.x,0.0)).x;float y0=texture2D(velocity,uv-vec2(0.0,px.y)).y;float y1=texture2D(velocity,uv+vec2(0.0,px.y)).y;float d=(x1-x0+y1-y0)/2.0;gl_FragColor=vec4(d/dt);}`;
    const externalForce_frag = `precision highp float;uniform vec2 force;uniform vec2 center;uniform vec2 scale;uniform vec2 px;varying vec2 vUv;void main(){vec2 circle=(vUv-0.5)*2.0;float d=1.0-min(length(circle),1.0);d*=d;gl_FragColor=vec4(force*d,0.0,1.0);}`;
    const poisson_frag = `precision highp float;uniform sampler2D pressure;uniform sampler2D divergence;uniform vec2 px;varying vec2 uv;void main(){float p0=texture2D(pressure,uv+vec2(px.x*2.0,0.0)).r;float p1=texture2D(pressure,uv-vec2(px.x*2.0,0.0)).r;float p2=texture2D(pressure,uv+vec2(0.0,px.y*2.0)).r;float p3=texture2D(pressure,uv-vec2(0.0,px.y*2.0)).r;float div=texture2D(divergence,uv).r;float nP=(p0+p1+p2+p3)/4.0-div;gl_FragColor=vec4(nP);}`;
    const pressure_frag = `precision highp float;uniform sampler2D pressure;uniform sampler2D velocity;uniform vec2 px;uniform float dt;varying vec2 uv;void main(){float s=1.0;float p0=texture2D(pressure,uv+vec2(px.x*s,0.0)).r;float p1=texture2D(pressure,uv-vec2(px.x*s,0.0)).r;float p2=texture2D(pressure,uv+vec2(0.0,px.y*s)).r;float p3=texture2D(pressure,uv-vec2(0.0,px.y*s)).r;vec2 v=texture2D(velocity,uv).xy;vec2 gP=vec2(p0-p1,p2-p3)*0.5;v=v-gP*dt;gl_FragColor=vec4(v,0.0,1.0);}`;
    const viscous_frag = `precision highp float;uniform sampler2D velocity;uniform sampler2D velocity_new;uniform float v;uniform vec2 px;uniform float dt;varying vec2 uv;void main(){vec2 old=texture2D(velocity,uv).xy;vec2 n0=texture2D(velocity_new,uv+vec2(px.x*2.0,0.0)).xy;vec2 n1=texture2D(velocity_new,uv-vec2(px.x*2.0,0.0)).xy;vec2 n2=texture2D(velocity_new,uv+vec2(0.0,px.y*2.0)).xy;vec2 n3=texture2D(velocity_new,uv-vec2(0.0,px.y*2.0)).xy;vec2 nv=4.0*old+v*dt*(n0+n1+n2+n3);nv/=4.0*(1.0+v*dt);gl_FragColor=vec4(nv,0.0,0.0);}`;

    type U = Record<string, { value: any }>;

    class SP {
      props: any; uniforms?: U; scene: THREE.Scene | null = null;
      camera: THREE.Camera | null = null; material: THREE.RawShaderMaterial | null = null;
      geometry: THREE.BufferGeometry | null = null; plane: THREE.Mesh | null = null;
      constructor(p: any) { this.props = p || {}; this.uniforms = this.props.material?.uniforms; }
      init() {
        this.scene = new THREE.Scene(); this.camera = new THREE.Camera();
        if (this.uniforms) {
          this.material = new THREE.RawShaderMaterial(this.props.material);
          this.geometry = new THREE.PlaneGeometry(2, 2);
          this.plane = new THREE.Mesh(this.geometry, this.material);
          this.scene.add(this.plane);
        }
      }
      update() {
        if (!Common.renderer || !this.scene || !this.camera) return;
        Common.renderer.setRenderTarget(this.props.output || null);
        Common.renderer.render(this.scene, this.camera);
        Common.renderer.setRenderTarget(null);
      }
    }

    class Advection extends SP {
      line!: THREE.LineSegments;
      constructor(s: any) {
        super({ material: { vertexShader: face_vert, fragmentShader: advection_frag, uniforms: { boundarySpace: { value: s.cellScale }, px: { value: s.cellScale }, fboSize: { value: s.fboSize }, velocity: { value: s.src.texture }, dt: { value: s.dt }, isBFECC: { value: true } } }, output: s.dst });
        this.uniforms = this.props.material.uniforms; this.init();
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1,-1,0,-1,1,0,-1,1,0,1,1,0,1,1,0,1,-1,0,1,-1,0,-1,-1,0]), 3));
        this.line = new THREE.LineSegments(g, new THREE.RawShaderMaterial({ vertexShader: line_vert, fragmentShader: advection_frag, uniforms: this.uniforms! }));
        this.scene!.add(this.line);
      }
      update(a?: any) { if (!this.uniforms) return; const o = a || {}; if (o.dt !== undefined) this.uniforms.dt.value = o.dt; if (o.isBounce !== undefined) this.line.visible = o.isBounce; if (o.BFECC !== undefined) this.uniforms.isBFECC.value = o.BFECC; super.update(); }
    }
    class ExternalForce extends SP {
      mouse!: THREE.Mesh;
      constructor(s: any) { super({ output: s.dst }); this.init(); const g = new THREE.PlaneGeometry(1, 1); const m = new THREE.RawShaderMaterial({ vertexShader: mouse_vert, fragmentShader: externalForce_frag, blending: THREE.AdditiveBlending, depthWrite: false, uniforms: { px: { value: s.cellScale }, force: { value: new THREE.Vector2(0, 0) }, center: { value: new THREE.Vector2(0, 0) }, scale: { value: new THREE.Vector2(s.cursor_size, s.cursor_size) } } }); this.mouse = new THREE.Mesh(g, m); this.scene!.add(this.mouse); }
      update(a?: any) { const p = a || {}; const u = (this.mouse.material as THREE.RawShaderMaterial).uniforms; const cs = p.cellScale || { x: 1, y: 1 }; const sz = p.cursor_size || 0; u.force.value.set((Mouse.diff.x / 2) * (p.mouse_force || 0), (Mouse.diff.y / 2) * (p.mouse_force || 0)); u.center.value.set(Math.min(Math.max(Mouse.coords.x, -1 + sz * cs.x + cs.x * 2), 1 - sz * cs.x - cs.x * 2), Math.min(Math.max(Mouse.coords.y, -1 + sz * cs.y + cs.y * 2), 1 - sz * cs.y - cs.y * 2)); u.scale.value.set(sz, sz); super.update(); }
    }
    class Viscous extends SP {
      constructor(s: any) { super({ material: { vertexShader: face_vert, fragmentShader: viscous_frag, uniforms: { boundarySpace: { value: s.boundarySpace }, velocity: { value: s.src.texture }, velocity_new: { value: s.dst_.texture }, v: { value: s.viscous }, px: { value: s.cellScale }, dt: { value: s.dt } } }, output: s.dst, output0: s.dst_, output1: s.dst }); this.init(); }
      update(a?: any): any { const o = a || {}; if (!this.uniforms) return; if (o.viscous !== undefined) this.uniforms.v.value = o.viscous; let fi: any, fo: any; for (let i = 0; i < (o.iterations ?? 0); i++) { if (i % 2 === 0) { fi = this.props.output0; fo = this.props.output1; } else { fi = this.props.output1; fo = this.props.output0; } this.uniforms.velocity_new.value = fi.texture; this.props.output = fo; if (o.dt !== undefined) this.uniforms.dt.value = o.dt; super.update(); } return fo; }
    }
    class Divergence extends SP {
      constructor(s: any) { super({ material: { vertexShader: face_vert, fragmentShader: divergence_frag, uniforms: { boundarySpace: { value: s.boundarySpace }, velocity: { value: s.src.texture }, px: { value: s.cellScale }, dt: { value: s.dt } } }, output: s.dst }); this.init(); }
      update(a?: any) { const o = a || {}; if (this.uniforms && o.vel) this.uniforms.velocity.value = o.vel.texture; super.update(); }
    }
    class Poisson extends SP {
      constructor(s: any) { super({ material: { vertexShader: face_vert, fragmentShader: poisson_frag, uniforms: { boundarySpace: { value: s.boundarySpace }, pressure: { value: s.dst_.texture }, divergence: { value: s.src.texture }, px: { value: s.cellScale } } }, output: s.dst, output0: s.dst_, output1: s.dst }); this.init(); }
      update(a?: any): any { const o = a || {}; let pi: any, po: any; for (let i = 0; i < (o.iterations ?? 0); i++) { if (i % 2 === 0) { pi = this.props.output0; po = this.props.output1; } else { pi = this.props.output1; po = this.props.output0; } if (this.uniforms) this.uniforms.pressure.value = pi.texture; this.props.output = po; super.update(); } return po; }
    }
    class Pressure extends SP {
      constructor(s: any) { super({ material: { vertexShader: face_vert, fragmentShader: pressure_frag, uniforms: { boundarySpace: { value: s.boundarySpace }, pressure: { value: s.src_p.texture }, velocity: { value: s.src_v.texture }, px: { value: s.cellScale }, dt: { value: s.dt } } }, output: s.dst }); this.init(); }
      update(a?: any) { const o = a || {}; if (this.uniforms && o.vel && o.pressure) { this.uniforms.velocity.value = o.vel.texture; this.uniforms.pressure.value = o.pressure.texture; } super.update(); }
    }

    class Simulation {
      options: SimOptions; fbos: Record<string, THREE.WebGLRenderTarget | null> = { vel_0: null, vel_1: null, vel_viscous0: null, vel_viscous1: null, div: null, pressure_0: null, pressure_1: null };
      fboSize = new THREE.Vector2(); cellScale = new THREE.Vector2(); boundarySpace = new THREE.Vector2();
      advection!: Advection; externalForce!: ExternalForce; viscous!: Viscous; divergence!: Divergence; poisson!: Poisson; pressure!: Pressure;
      constructor(o?: Partial<SimOptions>) { this.options = { iterations_poisson: 32, iterations_viscous: 32, mouse_force: 20, resolution: 0.5, cursor_size: 100, viscous: 30, isBounce: false, dt: 0.014, isViscous: false, BFECC: true, ...o }; this.init(); }
      init() { this.calcSize(); this.createFBO(); this.createPasses(); }
      getFloatType() { return /(iPad|iPhone|iPod)/i.test(navigator.userAgent) ? THREE.HalfFloatType : THREE.FloatType; }
      createFBO() { const t = this.getFloatType(); const o = { type: t, depthBuffer: false, stencilBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping } as const; for (const k in this.fbos) this.fbos[k] = new THREE.WebGLRenderTarget(this.fboSize.x, this.fboSize.y, o); }
      createPasses() {
        this.advection = new Advection({ cellScale: this.cellScale, fboSize: this.fboSize, dt: this.options.dt, src: this.fbos.vel_0, dst: this.fbos.vel_1 });
        this.externalForce = new ExternalForce({ cellScale: this.cellScale, cursor_size: this.options.cursor_size, dst: this.fbos.vel_1 });
        this.viscous = new Viscous({ cellScale: this.cellScale, boundarySpace: this.boundarySpace, viscous: this.options.viscous, src: this.fbos.vel_1, dst: this.fbos.vel_viscous1, dst_: this.fbos.vel_viscous0, dt: this.options.dt });
        this.divergence = new Divergence({ cellScale: this.cellScale, boundarySpace: this.boundarySpace, src: this.fbos.vel_viscous0, dst: this.fbos.div, dt: this.options.dt });
        this.poisson = new Poisson({ cellScale: this.cellScale, boundarySpace: this.boundarySpace, src: this.fbos.div, dst: this.fbos.pressure_1, dst_: this.fbos.pressure_0 });
        this.pressure = new Pressure({ cellScale: this.cellScale, boundarySpace: this.boundarySpace, src_p: this.fbos.pressure_0, src_v: this.fbos.vel_viscous0, dst: this.fbos.vel_0, dt: this.options.dt });
      }
      calcSize() { const w = Math.max(1, Math.round(this.options.resolution * Common.width)); const h = Math.max(1, Math.round(this.options.resolution * Common.height)); this.cellScale.set(1 / w, 1 / h); this.fboSize.set(w, h); }
      resize() { this.calcSize(); for (const k in this.fbos) this.fbos[k]!.setSize(this.fboSize.x, this.fboSize.y); }
      update() {
        if (this.options.isBounce) this.boundarySpace.set(0, 0); else this.boundarySpace.copy(this.cellScale);
        this.advection.update({ dt: this.options.dt, isBounce: this.options.isBounce, BFECC: this.options.BFECC });
        this.externalForce.update({ cursor_size: this.options.cursor_size, mouse_force: this.options.mouse_force, cellScale: this.cellScale });
        let vel: any = this.fbos.vel_1;
        if (this.options.isViscous) vel = this.viscous.update({ viscous: this.options.viscous, iterations: this.options.iterations_viscous, dt: this.options.dt });
        this.divergence.update({ vel }); const p = this.poisson.update({ iterations: this.options.iterations_poisson }); this.pressure.update({ vel, pressure: p });
      }
    }

    class Output {
      simulation: Simulation; scene: THREE.Scene; camera: THREE.Camera; output: THREE.Mesh;
      constructor() {
        this.simulation = new Simulation(); this.scene = new THREE.Scene(); this.camera = new THREE.Camera();
        this.output = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.RawShaderMaterial({ vertexShader: face_vert, fragmentShader: color_frag, transparent: true, depthWrite: false, uniforms: { velocity: { value: this.simulation.fbos.vel_0!.texture }, boundarySpace: { value: new THREE.Vector2() }, palette: { value: paletteTex }, bgColor: { value: bgVec4 } } }));
        this.scene.add(this.output);
      }
      resize() { this.simulation.resize(); }
      render() { if (!Common.renderer) return; Common.renderer.setRenderTarget(null); Common.renderer.render(this.scene, this.camera); }
      update() { this.simulation.update(); this.render(); }
    }

    class WM implements LiquidEtherWebGL {
      props: any; output!: Output; autoDriver?: AutoDriver; lastUserInteraction = performance.now(); running = false;
      private _loop = this.loop.bind(this); private _resize = this.doResize.bind(this); private _onVis?: () => void;
      constructor(p: any) {
        this.props = p; Common.init(p.$wrapper); Mouse.init(p.$wrapper);
        Mouse.autoIntensity = p.autoIntensity; Mouse.takeoverDuration = p.takeoverDuration;
        Mouse.onInteract = () => { this.lastUserInteraction = performance.now(); if (this.autoDriver) this.autoDriver.forceStop(); };
        this.autoDriver = new AutoDriver(Mouse, this, { enabled: p.autoDemo, speed: p.autoSpeed, resumeDelay: p.autoResumeDelay, rampDuration: p.autoRampDuration });
        this.init(); window.addEventListener('resize', this._resize);
        this._onVis = () => { if (document.hidden) this.pause(); else if (isVisibleRef.current) this.start(); };
        document.addEventListener('visibilitychange', this._onVis);
      }
      init() { if (!Common.renderer) return; this.props.$wrapper.prepend(Common.renderer.domElement); this.output = new Output(); }
      resize() { this.doResize(); }
      doResize() { Common.resize(); this.output.resize(); }
      render() { if (this.autoDriver) this.autoDriver.update(); Mouse.update(); Common.update(); this.output.update(); }
      loop() { if (!this.running) return; this.render(); rafRef.current = requestAnimationFrame(this._loop); }
      start() { if (this.running) return; this.running = true; this._loop(); }
      pause() { this.running = false; if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } }
      dispose() { try { window.removeEventListener('resize', this._resize); if (this._onVis) document.removeEventListener('visibilitychange', this._onVis); Mouse.dispose(); if (Common.renderer) { const c = Common.renderer.domElement; if (c?.parentNode) c.parentNode.removeChild(c); Common.renderer.dispose(); Common.renderer.forceContextLoss(); } } catch { /* noop */ } }
    }

    const container = mountRef.current;
    container.style.position = container.style.position || 'relative';
    container.style.overflow = container.style.overflow || 'hidden';

    const webgl = new WM({ $wrapper: container, autoDemo, autoSpeed, autoIntensity, takeoverDuration, autoResumeDelay, autoRampDuration });
    webglRef.current = webgl;

    const sim = webgl.output?.simulation;
    if (sim) Object.assign(sim.options, { mouse_force: mouseForce, cursor_size: cursorSize, isViscous, viscous, iterations_viscous: iterationsViscous, iterations_poisson: iterationsPoisson, dt, BFECC, resolution, isBounce });
    webgl.start();

    const io = new IntersectionObserver((entries) => {
      const e = entries[0]; const vis = e.isIntersecting && e.intersectionRatio > 0;
      isVisibleRef.current = vis;
      if (!webglRef.current) return;
      if (vis && !document.hidden) webglRef.current.start(); else webglRef.current.pause();
    }, { threshold: [0, 0.01, 0.1] });
    io.observe(container); intersectionObserverRef.current = io;

    const ro = new ResizeObserver(() => {
      if (!webglRef.current) return;
      if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current);
      resizeRafRef.current = requestAnimationFrame(() => { webglRef.current?.resize(); });
    });
    ro.observe(container); resizeObserverRef.current = ro;

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try { resizeObserverRef.current?.disconnect(); } catch { /* noop */ }
      try { intersectionObserverRef.current?.disconnect(); } catch { /* noop */ }
      webglRef.current?.dispose(); webglRef.current = null;
    };
  }, [BFECC, cursorSize, dt, isBounce, isViscous, iterationsPoisson, iterationsViscous, mouseForce, resolution, viscous, colors, autoDemo, autoSpeed, autoIntensity, takeoverDuration, autoResumeDelay, autoRampDuration]);

  return <div ref={mountRef} className={`liquid-ether-container ${className || ''}`} style={style} />;
}
