import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as CANNON from 'cannon-es';
import * as TWEEN from "@tweenjs/tween.js";
class ThreeJSContainer {
    private scene: THREE.Scene;
    private geometry: THREE.BufferGeometry;
    private material: THREE.Material;
    private cube: THREE.Mesh;
    private light: THREE.Light;
    private cloud : THREE.Points;
    private pNum: number;
    private tween = [];

    constructor() {

    }

    // 画面部分の作成(表示する枠ごとに)*
    public createRendererDOM = (width: number, height: number, cameraPos: THREE.Vector3) => {
        let renderer = new THREE.WebGLRenderer();
        renderer.setSize(width, height);
        renderer.setClearColor(new THREE.Color(0x495ed));

        //カメラの設定
        let camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.copy(cameraPos);
        camera.lookAt(new THREE.Vector3(0, 0, 0));
        camera.position.y = 10;
        camera.position.x = -10;
        camera.position.z = 20;

        let orbitControls = new OrbitControls(camera, renderer.domElement);

        this.createScene();
        // 毎フレームのupdateを呼んで，render
        // reqestAnimationFrame により次フレームを呼ぶ
        let render: FrameRequestCallback = (time) => {
            orbitControls.update();

            renderer.render(this.scene, camera);
            requestAnimationFrame(render);
        }
        requestAnimationFrame(render);

        renderer.domElement.style.cssFloat = "left";
        renderer.domElement.style.margin = "10px";
        return renderer.domElement;
    }

    // シーンの作成(全体で1回)
    private createScene = () => {
        this.scene = new THREE.Scene();

        this.geometry = new THREE.BoxGeometry(1, 1, 1);
        this.material = new THREE.MeshLambertMaterial({ color: 0x55ff00 });
        this.cube = new THREE.Mesh(this.geometry, this.material);
        this.cube.castShadow = true;
        //this.scene.add(this.cube);

        //ライトの設定
        this.light = new THREE.DirectionalLight(0xffffff);
        let lvec = new THREE.Vector3(1, 1, 1).normalize();
        this.light.position.set(lvec.x, lvec.y, lvec.z);
        this.scene.add(this.light);

        const world = new CANNON.World();
        world.gravity.set(0, -9.82, 0);
        world.defaultContactMaterial.friction = 0.6;
        world.defaultContactMaterial.restitution = 0.3;
        
        //床のCG
        const phongMaterial = new THREE.MeshPhongMaterial();
        const planeGeometry = new THREE.PlaneGeometry(25, 25);
        const planeMesh = new THREE.Mesh(planeGeometry, phongMaterial);
        planeMesh.material.side = THREE.DoubleSide; // 両面
        planeMesh.rotateX(-Math.PI / 2);
        this.scene.add(planeMesh);

        //物理演算用の床
        const planeShape = new CANNON.Plane()
        const planeBody = new CANNON.Body({ mass: 0 })
        planeBody.addShape(planeShape)
        planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2)
        world.addBody(planeBody)
        
        //坂道のCG
        const phongMaterial_2 = new THREE.MeshPhongMaterial();
        const planeGeometry_2 = new THREE.PlaneGeometry(25, 25);
        const planeMesh_2 = new THREE.Mesh(planeGeometry_2, phongMaterial_2);
        planeMesh_2.material.side = THREE.DoubleSide; // 両面
        planeMesh_2.rotateX(-Math.PI / 3);
        planeMesh_2.position.y=12.5/Math.sqrt(3);
        planeMesh_2.position.z=-22;
        this.scene.add(planeMesh_2);
        
        //物理演算用の坂道
        const planeShape_2 = new CANNON.Plane()
        const planeBody_2 = new CANNON.Body({ mass: 0 })
        planeBody_2.addShape(planeShape_2)
        planeBody_2.position.y = planeMesh_2.position.y;
        planeBody_2.position.z = planeMesh_2.position.z;
        planeBody_2.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 3)
        world.addBody(planeBody_2)
        
        //プレイヤー
        const playerMaterial = new THREE.MeshPhongMaterial({color: new THREE.Color("rgb(255,0,0)")});
        const playerGeometry = new THREE.SphereGeometry();
        let playerSphere = new THREE.Mesh(playerGeometry,playerMaterial);
        playerSphere.position.y = 0.6;
        playerSphere.position.z = 12;
        this.scene.add(playerSphere);

        //球
        const sphereGeometry = new THREE.SphereGeometry();
        const sphereMaterial = new THREE.MeshPhongMaterial();
        let mesh = [];
       // while(true){
        for(let i = 0; i < 5; i++){
          mesh[i] = new THREE.Mesh(sphereGeometry,sphereMaterial);
          let t = getRandomArbitrary(-69/2,-22);
          mesh[i].position.z = 12.5;
          mesh[i].position.y = 1.3;
          mesh[i].position.x = -12.5+(25/5)*i;
          this.scene.add(mesh[i]);
        }

        //物理演算用の球
        const sphereShape = [];
        const sphereBody = [];
        for(let i = 0; i < 5; i++){
            sphereShape[i] = new CANNON.Sphere(1);
            sphereBody[i] = new CANNON.Body({mass:1});
            sphereBody[i].addShape(sphereShape[i]);
            sphereBody[i].position.x = mesh[i].position.x;
            sphereBody[i].position.y = mesh[i].position.y;
            sphereBody[i].position.z = mesh[i].position.z;
            sphereBody[i].velocity.x = 0;
            sphereBody[i].velocity.y = 0;
            sphereBody[i].velocity.z = 5;
            world.addBody(sphereBody[i]);
        }

        function cal(t){ //坂の上に球が生成されるようにする為の関数
          let y : number;
          return y = -Math.sqrt(3)*t-22*Math.sqrt(3)+5; 
        }

        function getRandomArbitrary(min, max) { //範囲を指定して乱数を作る関数
            let t :number;
            t = Math.random() * (max - min) + min
            return t;
          }

        function collisionJudg(enemy: THREE.Mesh , player : THREE.Mesh){ //球とプレイヤーが接触したかを判定する関数
            let collision = false;
            let dx = enemy.position.x - player.position.x;
            let dy = enemy.position.y - player.position.y;
            let dz = enemy.position.z - player.position.z;
            let distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
            if(distance < 2){
                collision = true;
            }
            return collision;
        }

        let generateSprite = () =>{
            //新しいキャンバスの作成
            let canvas = document.createElement('canvas');
            canvas.width = 16;
            canvas.height = 16;
        
             //円形のグラデーションの作成
             let context = canvas.getContext('2d');
             let gradient = context.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width / 2);
             gradient.addColorStop(0, 'rgba(255,255,255,1)');
             gradient.addColorStop(0.2, 'rgba(0,255,255,1)');
             gradient.addColorStop(0.4, 'rgba(0, 0,64,1)');
             gradient.addColorStop(1, 'rgba(0,0,0,1)');
             
             context.fillStyle = gradient;
             context.fillRect(0, 0, canvas.width, canvas.height);
             //テクスチャの生成
             let texture = new THREE.Texture(canvas);
             texture.needsUpdate = true;
             return texture;
        }

        let createParticles = () =>{
            let geom = new THREE.BufferGeometry();

            let pointMaterial = new THREE.PointsMaterial({size:1, color:0xFFFFFF, transparent: true,  blending: THREE.AdditiveBlending,
                depthWrite: false , map: generateSprite()});

            this.pNum = 1000; // パーティクルの数

            let positions = new Float32Array(this.pNum*3);
            let parIndex = 0;
            for(let i = 0; i < this.pNum; i++){
                let u = getRandomArbitrary(0,2*Math.PI);
                let v = getRandomArbitrary(-Math.PI/2,Math.PI/2);
               positions[parIndex++] = Math.cos(v)*Math.cos(u);
               positions[parIndex++] = Math.cos(v)*Math.sin(u);
               positions[parIndex++] = Math.sin(v);
            }
            geom.setAttribute('position', new THREE.BufferAttribute(positions,3));

            this.cloud = new THREE.Points(geom, pointMaterial);
        }
        createParticles();

        let updateCloud = (index, x, y, z) =>{
            let geom = <THREE.BufferGeometry>this.cloud.geometry;
            let pos = geom.getAttribute('position');
            pos.needsUpdate = true;
            pos.setX(index,x);
            pos.setY(index,y);
            pos.setZ(index,z);
         }

        for (let pIndex = 0; pIndex < this.pNum; pIndex++) { //パーティクル一つ一つのtweenを作成する
            //スタート地点
            let geom = <THREE.BufferGeometry>this.cloud.geometry;
            let pos = geom.getAttribute('position');
            let sqx = pos.getX(pIndex);
            let sqy = pos.getY(pIndex);
            let sqz = pos.getZ(pIndex);
            //ゴール地点
            var shx = Math.random()*100;
            var shy = Math.random()*100;
            var shz = Math.random()*100;
            let tweeninfo = { x: sqx, y: sqy, z: sqz, index: pIndex};
            this.tween[pIndex] = new TWEEN.Tween(tweeninfo).to({ x: shx, y: shy, z: shz },
                5000).onUpdate(()=> {
                 updateCloud(tweeninfo.index, tweeninfo.x, tweeninfo.y, tweeninfo.z);
            });
     }

        document.addEventListener('keydown',function(event){ //キー操作でplayerSphereを操作する
            switch(event.key){
             case 'ArrowRight':
                playerSphere.position.x++;
                break;
             case 'ArrowLeft':
                playerSphere.position.x--;
                break;
            }
            
        })


        // 毎フレームのupdateを呼んで，更新
        // reqestAnimationFrame により次フレームを呼ぶ
        const clock = new THREE.Clock();
        var collision = false;
        let update: FrameRequestCallback = (time) => {
            let delta = Math.min(clock.getDelta(), 0.1);
            world.step(delta)
            
           this.cloud.position.x = playerSphere.position.x;
           this.cloud.position.y = playerSphere.position.y;
           this.cloud.position.z = playerSphere.position.z;

           for(let i = 0; i < 5; i++){
             mesh[i].position.x = sphereBody[i].position.x;
             mesh[i].position.y = sphereBody[i].position.y;
             mesh[i].position.z = sphereBody[i].position.z;
            if(mesh[i].position.z > 13){
             let t = getRandomArbitrary(-69/2,-22);
             sphereBody[i].position.z = t + 5;
             sphereBody[i].position.y = cal(t) + 5;
             sphereBody[i].position.x = getRandomArbitrary(-12,12);
             sphereBody[i].velocity.x = 0;
             sphereBody[i].velocity.y = 0;
             sphereBody[i].velocity.z = 0;
            }
            //プレイヤーと球が衝突した時の処理
            if(collisionJudg(mesh[i],playerSphere)){
                for(let i = 0; i < 5; i++){
                this.scene.remove(mesh[i]); 
                }
                this.scene.remove(playerSphere);
                this.scene.add(this.cloud);
                for(let i = 0; i < this.pNum; i++){
                this.tween[i].start(); //プレイヤーと球が衝突したらアニメーションをスタートする。
                
                }
            }
           }
            requestAnimationFrame(update);
            TWEEN.update();
        }
        requestAnimationFrame(update);
    }
}

window.addEventListener("DOMContentLoaded", init);

function init() {
    let container = new ThreeJSContainer();

    let viewport = container.createRendererDOM(640, 480, new THREE.Vector3(-3, 3, 3));
    document.body.appendChild(viewport);
}
