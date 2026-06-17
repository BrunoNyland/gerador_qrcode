import { Injectable, NgZone } from '@angular/core';
import * as THREE from 'three';

@Injectable({
  providedIn: 'root'
})
export class Background3DService {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private blob!: THREE.Mesh;
  private wireframeBlob!: THREE.Mesh;
  private originalPositions!: Float32Array;
  private animationFrameId?: number;
  private dirLight1!: THREE.PointLight;
  private dirLight2!: THREE.PointLight;
  private dirLight3!: THREE.PointLight;

  private mouseX = 0;
  private mouseY = 0;
  private targetX = 0;
  private targetY = 0;

  constructor(private ngZone: NgZone) {}

  public init(canvas: HTMLCanvasElement): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.z = 8;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(ambientLight);

    this.dirLight1 = new THREE.PointLight(0x00f0ff, 2, 50); // Accent light
    this.dirLight1.position.set(5, 5, 5);
    this.scene.add(this.dirLight1);

    this.dirLight2 = new THREE.PointLight(0x00f0ff, 1.2, 50); // Accent secondary light
    this.dirLight2.position.set(-5, -5, 5);
    this.scene.add(this.dirLight2);

    this.dirLight3 = new THREE.PointLight(0xffffff, 0.8, 30); // Neutral light
    this.dirLight3.position.set(0, 5, -5);
    this.scene.add(this.dirLight3);

    // Geometry - Icosahedron for organic deforming blob
    const geometry = new THREE.IcosahedronGeometry(2.2, 5); // Radius 2.2, detail 5
    
    // Save original positions for deforming calculation
    const posAttribute = geometry.attributes['position'] as THREE.BufferAttribute;
    this.originalPositions = posAttribute.array.slice() as Float32Array;

    // Solid material with glass-like/holographic properties
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x18181a,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.6, // Glass-like transparency
      thickness: 1.2,
      ior: 1.5,
      transparent: true,
      opacity: 0.45,
      flatShading: true
    });

    // Wireframe material for the techno-futuristic look
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.18
    });

    // Create Meshes
    this.blob = new THREE.Mesh(geometry, material);
    this.wireframeBlob = new THREE.Mesh(geometry.clone(), wireframeMaterial);

    this.scene.add(this.blob);
    this.scene.add(this.wireframeBlob);

    // Bind event listeners
    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('mousemove', this.onMouseMove);

    // Start animation loop outside Angular Zone for performance
    this.ngZone.runOutsideAngular(() => {
      this.animate(0);
    });
  }

  public destroy(): void {
    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    
    // Dispose resources
    if (this.blob) {
      this.blob.geometry.dispose();
      (this.blob.material as THREE.Material).dispose();
    }
    if (this.wireframeBlob) {
      this.wireframeBlob.geometry.dispose();
      (this.wireframeBlob.material as THREE.Material).dispose();
    }
    this.renderer?.dispose();
  }

  private onWindowResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  };

  private onMouseMove = (event: MouseEvent): void => {
    // Normalize coordinates from -1 to 1
    this.targetX = (event.clientX / window.innerWidth) * 2 - 1;
    this.targetY = -(event.clientY / window.innerHeight) * 2 + 1;
  };

  private animate = (time: number): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const clockTime = time * 0.001; // Seconds

    // Update positions (deform blob)
    this.deformGeometry(this.blob.geometry as THREE.BufferGeometry, clockTime);
    this.deformGeometry(this.wireframeBlob.geometry as THREE.BufferGeometry, clockTime);

    // Smooth mouse parallax interpolation (easing)
    this.mouseX += (this.targetX - this.mouseX) * 0.05;
    this.mouseY += (this.targetY - this.mouseY) * 0.05;

    // Slow organic rotations
    this.blob.rotation.x = clockTime * 0.15 + this.mouseY * 0.2;
    this.blob.rotation.y = clockTime * 0.1 + this.mouseX * 0.2;

    this.wireframeBlob.rotation.x = this.blob.rotation.x;
    this.wireframeBlob.rotation.y = this.blob.rotation.y;

    // Subtle scale pulsing
    const scalePulse = 1 + Math.sin(clockTime * 0.8) * 0.04;
    this.blob.scale.set(scalePulse, scalePulse, scalePulse);
    this.wireframeBlob.scale.set(scalePulse, scalePulse, scalePulse);

    this.renderer.render(this.scene, this.camera);
  };

  private deformGeometry(geometry: THREE.BufferGeometry, time: number): void {
    const posAttribute = geometry.attributes['position'] as THREE.BufferAttribute;
    const array = posAttribute.array as Float32Array;

    for (let i = 0; i < array.length; i += 3) {
      const origX = this.originalPositions[i];
      const origY = this.originalPositions[i + 1];
      const origZ = this.originalPositions[i + 2];

      // Calculate distortion using multiple sine/cosine waves based on coordinates and time
      const wave = Math.sin(origX * 1.5 + time) * 0.12 +
                   Math.cos(origY * 1.2 - time * 0.8) * 0.12 +
                   Math.sin(origZ * 1.8 + time * 1.3) * 0.1;

      // Project vertex outward along its original vector direction
      array[i] = origX * (1 + wave);
      array[i + 1] = origY * (1 + wave);
      array[i + 2] = origZ * (1 + wave);
    }

    posAttribute.needsUpdate = true;
  }

  public updateColors(hexColor: string): void {
    const color = new THREE.Color(hexColor);
    
    if (this.dirLight1) {
      this.dirLight1.color.copy(color);
    }
    if (this.dirLight2) {
      // dirLight2 is a secondary light; copy the color to keep the scene consistent
      this.dirLight2.color.copy(color);
    }
    if (this.wireframeBlob) {
      const mat = this.wireframeBlob.material as THREE.MeshBasicMaterial;
      mat.color.copy(color);
    }
  }
}
