// ============================================
// SCENE.JS - Scene Setup and 3D Model Loading
// Creates lights, ground, primitives, and loads GLTF models
// ============================================



import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// Initialize scene with lights, ground, and primitive objects
// Parameters: scene, rigGroup, interactiveObjects, camera, renderer
// Returns: metalMaterial and drillString objects
export function initScene(scene, rigGroup, interactiveObjects, camera, renderer) {
    const textureLoader = new THREE.TextureLoader();

    // Add ambient light for general illumination
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    // Add directional light for shadows
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(50, 100, 50);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048,2048);
    scene.add(dir);

    // Add fill light to soften shadows
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-50,50,-50);
    scene.add(fillLight);

    // Load metal PBR textures for rig components
    const metalColorMap = textureLoader.load('./assets/textures/Metal062C_2K-PNG_Color.png');
    const metalMetalnessMap = textureLoader.load('./assets/textures/Metal062C_2K-PNG_Metalness.png');
    const metalNormalMap = textureLoader.load('./assets/textures/Metal062C_2K-PNG_NormalGL.png');
    const metalRoughnessMap = textureLoader.load('./assets/textures/Metal062C_2K-PNG_Roughness.png');

    // Set texture wrapping modes
    metalColorMap.wrapS = metalColorMap.wrapT = THREE.RepeatWrapping;
    metalMetalnessMap.wrapS = metalMetalnessMap.wrapT = THREE.RepeatWrapping;
    metalNormalMap.wrapS = metalNormalMap.wrapT = THREE.RepeatWrapping;
    metalRoughnessMap.wrapS = metalRoughnessMap.wrapT = THREE.RepeatWrapping;
    metalColorMap.colorSpace = THREE.SRGBColorSpace;

    // Create metal material with PBR textures
    const metalMaterial = new THREE.MeshStandardMaterial({
        map: metalColorMap,
        metalnessMap: metalMetalnessMap,
        normalMap: metalNormalMap,
        roughnessMap: metalRoughnessMap,
        metalness: 0.8,
        roughness: 1.0,
        envMapIntensity: 1.0
    });

    // Load sand textures for ground
    const sandColorMap = textureLoader.load('./assets/textures/Sand_004_COLOR.png');
    const sandNormalMap = textureLoader.load('./assets/textures/Sand_004_Normal.png');
    const sandRoughnessMap = textureLoader.load('./assets/textures/Sand_004_ROUGH.png');

    // Set texture wrapping and repeat
    sandColorMap.wrapS = sandColorMap.wrapT = THREE.RepeatWrapping;
    sandNormalMap.wrapS = sandNormalMap.wrapT = THREE.RepeatWrapping;
    sandRoughnessMap.wrapS = sandRoughnessMap.wrapT = THREE.RepeatWrapping;
    sandColorMap.repeat.set(10,10);
    sandNormalMap.repeat.set(10,10);
    sandRoughnessMap.repeat.set(10,10);
    sandColorMap.colorSpace = THREE.SRGBColorSpace;

    // Create ground material with PBR textures
    const groundMat = new THREE.MeshStandardMaterial({
        map: sandColorMap,
        normalMap: sandNormalMap,
        roughnessMap: sandRoughnessMap,
        roughness: 0.8
    });

    // Create and position ground plane
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(5000,5000), groundMat);
    ground.rotation.x = -Math.PI/2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Create Drill String - the main drilling pipe
    const drillString = new THREE.Mesh(
        new THREE.CylinderGeometry(1, 1, 400, 16),
        new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );
    drillString.position.set(0, 170, 0);
    drillString.userData = {
        name: "Drill String",
        info: "A column of drill pipes that transmits rotation and weight to the drill bit. Used for drilling and tripping operations."
    };
    rigGroup.add(drillString);
    interactiveObjects.push(drillString);

    // Create Traveling Block - moves up and down the derrick
    const travelingBlockZone = new THREE.Mesh(
        new THREE.BoxGeometry(10, 10, 10),
        new THREE.MeshBasicMaterial({ visible: false })
    );
    travelingBlockZone.position.set(0, 215, 0);
    travelingBlockZone.userData = {
        name: "Traveling Block",
        info: "A movable pulley system that travels up and down the derrick."
    };
    rigGroup.add(travelingBlockZone);
    interactiveObjects.push(travelingBlockZone);

    // Create Crown Block - fixed pulley system at top of derrick (visible for positioning)
    const crownBlock = new THREE.Mesh(
        new THREE.BoxGeometry(20, 15, 20),
        new THREE.MeshStandardMaterial({ visible: false })
    );
    crownBlock.position.set(0, 525, 0);
    crownBlock.userData = {
        name: "Crown Block",
        info: "A fixed pulley system at the top of the derrick that guides the drilling line."
    };
    rigGroup.add(crownBlock);
    interactiveObjects.push(crownBlock);

    // Create Drawworks - the hoisting system
    const drawworksZone = new THREE.Mesh(
        new THREE.BoxGeometry(50, 25, 25),
        new THREE.MeshBasicMaterial({ visible: false })
    );
    drawworksZone.position.set(0, 120, -55);
    drawworksZone.userData = {
        name: "Drawworks",
        info: "A hoisting system with a large drum that spools the drilling line."
    };
    rigGroup.add(drawworksZone);
    interactiveObjects.push(drawworksZone);

    // Drilling Line (Cable) - from drawworks → crown block → traveling block → hook
    const drillingLinePath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 100, -47),     // Drawworks
        new THREE.Vector3(0, 200, -30),     // Going up towards crown
        new THREE.Vector3(0, 350, -10),     // Mid point
        new THREE.Vector3(3, 525, 0),       // Crown Block
        new THREE.Vector3(3, 400, 0),        // Going down from crown
        new THREE.Vector3(3, 170, 0),       // Traveling Block
        new THREE.Vector3(3, 130, 0)        // Hook
    ]);
    const drillingLineGeometry = new THREE.TubeGeometry(drillingLinePath, 32, 0.5, 8, false);
    const drillingLine = new THREE.Mesh(
        drillingLineGeometry,
        new THREE.MeshStandardMaterial({ color: 0xFFCC00, metalness: 0.4, roughness: 0.6 })
    );
    drillingLine.userData = { name: "Drilling Line", info: "Steel cable that transfers force from drawworks to the hook." };
    rigGroup.add(drillingLine);
    interactiveObjects.push(drillingLine);

    // Create Standpipe - carries high-pressure drilling fluid
    const standpipe = new THREE.Mesh(
        new THREE.CylinderGeometry(2, 2, 120, 16),
        metalMaterial.clone()
    );
    standpipe.position.set(-55, 150, 0);
    standpipe.castShadow = standpipe.receiveShadow = true;
    standpipe.userData = { name: "Standpipe", info: "Carries high-pressure drilling fluid." };
    rigGroup.add(standpipe);
    interactiveObjects.push(standpipe);

    // Discharge Line - L-shaped pipe from mud pump to standpipe (90 degree angle)
    const dischargeLinePath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-150, 5, 0),    // Mud Pump 1 outlet
        new THREE.Vector3(-150, 50, 0),   // Going up (vertical)
        new THREE.Vector3(-90, 90, 0),    // Top of vertical, start horizontal
        new THREE.Vector3(-70, 90, 0),    // Horizontal towards standpipe
        new THREE.Vector3(-55, 90, 0)      // Standpipe lower end
    ]);
    const dischargeLineGeometry = new THREE.TubeGeometry(dischargeLinePath, 20, 3, 12, false);
    const dischargeLine = new THREE.Mesh(dischargeLineGeometry, new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6, roughness: 0.7 }));
    dischargeLine.userData = { name: "Discharge Line", info: "Transfers high-pressure fluid from mud pump to standpipe." };
    rigGroup.add(dischargeLine);
    interactiveObjects.push(dischargeLine);

    // Create Gooseneck - small curved pipe connecting standpipe to hose
    const gooseneckPath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-4, 0, 0),    // Start at standpipe
        new THREE.Vector3(-4, 2, 0),    // Curve up and out
        new THREE.Vector3(-6, 5, 0),    // Arch peak
        new THREE.Vector3(6, 5, 0),     // Arch peak (symmetric)
        new THREE.Vector3(7, 2, 0),     // Curve down
        new THREE.Vector3(7, 0, 0)       // End point
    ]);
    const gooseneckGeometry = new THREE.TubeGeometry(gooseneckPath, 16, 2, 12, false);
    const gooseneck = new THREE.Mesh(
        gooseneckGeometry,
        new THREE.MeshStandardMaterial({ 
            color: 0x666666, 
            metalness: 0.8, 
            roughness: 0.4 
        })
    );
    gooseneck.position.set(-51, 210, 0);
    gooseneck.userData = { name: "Gooseneck", info: "Curved pipe connection from standpipe to kelly hose." };
    rigGroup.add(gooseneck);
    interactiveObjects.push(gooseneck);

    return { metalMaterial, drillString };
}

// Load all GLTF 3D models
export function loadModels(rigGroup, interactiveObjects, metalMaterial, onModelLoad, onAllLoaded) {
    const textureLoader = new THREE.TextureLoader();
    
    // Setup DRACOLoader for compressed GLTF models
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    
    let loadedCount = 0;
    const totalModels = 12;
    
    const checkAllLoaded = () => {
        loadedCount++;
        if (loadedCount === totalModels && onAllLoaded) {
            onAllLoaded();
        }
    };

    // Load Mud Pump 1 and create clone as Mud Pump 2
    loader.load('./assets/models/mud_pump.glb', (gltf) => {
        const mudPump1 = gltf.scene;
        const steelMaterial = new THREE.MeshStandardMaterial({
            color: 0x5a5a5a,
            metalness: 0.75,
            roughness: 0.6
        });
       
        mudPump1.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = child.receiveShadow = true;
                child.userData = { name: "Mud Pump 1", info: "Circulates drilling fluid under high pressure." };
                child.material = steelMaterial;
            }
        });
        mudPump1.scale.set(50, 50, 50);
        mudPump1.position.set(-100, 0, 0);
        rigGroup.add(mudPump1);
        interactiveObjects.push(mudPump1);

        // Clone for Mud Pump 2 and add to interactive objects
        const mudPump2 = mudPump1.clone(true);
        mudPump2.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = child.receiveShadow = true;
                child.userData = { name: "Mud Pump 2", info: "Backup pump to maintain circulation." };
                interactiveObjects.push(child);
            }
        });
        mudPump2.scale.set(50, 50, 50);
        mudPump2.position.set(-150, 0, 0);
        rigGroup.add(mudPump2);
        
        if (onModelLoad) onModelLoad(mudPump1, null);
        checkAllLoaded();
    });
    

    // Load Shale Shaker - removes drill cuttings
    loader.load('./assets/models/shale_shaker.glb', (gltf) => {
        const shaleShaker = gltf.scene;
        shaleShaker.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = child.receiveShadow = true;
                child.userData = { name: "Shale Shaker", info: "Removes drill cuttings from drilling fluid using vibrating screens." };
                interactiveObjects.push(child);
            }
        });
        shaleShaker.scale.set(80, 80, 80);
        shaleShaker.position.set(-150, 0, -140);
        rigGroup.add(shaleShaker);

        // Flowline pipe from BOP to shale shaker (curved with downward slope)
        const flowlinePath = new THREE.CatmullRomCurve3([
            new THREE.Vector3(5, 50, 0),      // Start at BOP
            new THREE.Vector3(-40, 6, -70),    // Slightly up
            new THREE.Vector3(-80, 8, -70),    // Peak/transition
            new THREE.Vector3(-120, 4, -70),   // Downward slope
            new THREE.Vector3(-150, 0, -140)  // End at shale shaker
        ]);
        
        const flowlineGeometry = new THREE.TubeGeometry(flowlinePath, 32, 3, 16, false);
        const flowline = new THREE.Mesh(
            flowlineGeometry,
            new THREE.MeshStandardMaterial({ 
                color: 0x555555, 
                metalness: 0.7, 
                roughness: 0.6 
            })
        );
        flowline.userData = { name: "Flowline", info: "Transports drilling fluid from well to shale shaker." };
        rigGroup.add(flowline);
        interactiveObjects.push(flowline);

        checkAllLoaded();
    });

    // Load Mud Tank - stores drilling fluid (with 2 clones)
    loader.load('./assets/models/mud_tank.glb', (gltf) => {
        const mudTank = gltf.scene;
        mudTank.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = child.receiveShadow = true;
                child.userData = { name: "Mud Tank", info: "Stores and conditions drilling fluid before recirculation." };
                interactiveObjects.push(child);
            }
        });
        mudTank.scale.set(70, 70, 70);
        mudTank.position.set(-300, 40, -80);
        rigGroup.add(mudTank);
        
        // Clone for tank 2 and add to interactive objects
        const tank2 = mudTank.clone(true);
        tank2.traverse((child) => {
            if (child.isMesh) {
                child.userData = { name: "Mud Tank", info: "Stores and conditions drilling fluid before recirculation." };
                interactiveObjects.push(child);
            }
        });
        tank2.position.set(-300, 40, -180);
        rigGroup.add(tank2);
        
        // Clone for tank 3 and add to interactive objects
        const tank3 = mudTank.clone(true);
        tank3.traverse((child) => {
            if (child.isMesh) {
                child.userData = { name: "Mud Tank", info: "Stores and conditions drilling fluid before recirculation." };
                interactiveObjects.push(child);
            }
        });
        tank3.position.set(-300, 40, -280);
        rigGroup.add(tank3);

        // Suction Line - from Mud Tank 1 to Mud Pump 1 (slight downward slope)
        const suctionLine1Path = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-300, 5, -80),
            new THREE.Vector3(-250, 15, -50),
            new THREE.Vector3(-200, 43, -10),
       
        ]);
        const suctionLine1Geometry = new THREE.TubeGeometry(suctionLine1Path, 20, 7, 12, false);
        const suctionLine1 = new THREE.Mesh(suctionLine1Geometry, new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.7, roughness: 0.5 }));
        suctionLine1.userData = { name: "Suction Line", info: "Suctions drilling fluid from mud tank to mud pump." };
        rigGroup.add(suctionLine1);
        interactiveObjects.push(suctionLine1);

        // Suction Line - from Mud Tank 2 to Mud Pump 2
        const suctionLine2Path = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-300, 15, -180),
            new THREE.Vector3(-250, 12, -160),
            new THREE.Vector3(-200, 8, -130),
            new THREE.Vector3(-160, 5, -100),
            new THREE.Vector3(-150, 5, 0)
        ]);
        const suctionLine2Geometry = new THREE.TubeGeometry(suctionLine2Path, 20, 7, 12, false);
        const suctionLine2 = new THREE.Mesh(suctionLine2Geometry, new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.7, roughness: 0.5 }));
        suctionLine2.userData = { name: "Suction Line", info: "Suctions drilling fluid from mud tank to mud pump." };
        rigGroup.add(suctionLine2);
        interactiveObjects.push(suctionLine2);

        checkAllLoaded();
    });

    // Load main derrick model
    loader.load('./assets/models/model.gltf', (gltf) => {
        const rig = gltf.scene;
        rig.traverse((child) => {
            if(child.isMesh){
                child.castShadow = child.receiveShadow = true;
                child.material = metalMaterial;
                child.userData.ignoreHover = true;
            }
        });
        rig.scale.set(0.1,0.1,0.1);
        rig.rotation.x = (Math.PI*3)/2;
        rig.position.set(0,280,0);
        rigGroup.add(rig);
        checkAllLoaded();
    });

    // Load Top Drive - provides rotation and torque
    let topDriveGroup;
    loader.load('./assets/models/top_drive.glb', (gltf) => {
        const model = gltf.scene;
        topDriveGroup = new THREE.Group();
        topDriveGroup.add(model);
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = child.receiveShadow = true;
                child.userData = { name: "Top Drive", info: "Provides rotation and torque to the drill string." };
            }
        });
        topDriveGroup.scale.set(50, 50, 50);
        topDriveGroup.position.set(0, 165, 0);
        rigGroup.add(topDriveGroup);
        interactiveObjects.push(topDriveGroup);

        // Create Kelly Hose - long curved hose from gooseneck to top drive (downward curve, 3 points)
        const kellyHosePath = new THREE.CatmullRomCurve3([
            new THREE.Vector3(38, 5, 0),       // Start at gooseneck
            new THREE.Vector3(50, -30, 0),     // Going down
            new THREE.Vector3(60, -50, 0),     // Bottom/peak of curve
            new THREE.Vector3(70, -30, 0),     // Going up
            new THREE.Vector3(80, -20, 0)       // End at top drive
        ]);
        const kellyHoseGeometry = new THREE.TubeGeometry(kellyHosePath, 24, 2.5, 12, false);
        const kellyHose = new THREE.Mesh(
            kellyHoseGeometry,
            new THREE.MeshStandardMaterial({ 
                color: 0x444444, 
                metalness: 0.6, 
                roughness: 0.5 
            })
        );
        kellyHose.position.set(-84, 210, 0);
        kellyHose.userData = { name: "Kelly Hose", info: "Flexible high-pressure hose that connects the standpipe to the kelly." };
        rigGroup.add(kellyHose);
        interactiveObjects.push(kellyHose);
        
        if (onModelLoad) onModelLoad(null, topDriveGroup);
        checkAllLoaded();
    });

    // Load BOP textures
    const bopColorMap = textureLoader.load('./assets/textures/bop-red.png');
    const bopNormalMap = textureLoader.load('./assets/textures/bop-normal.png');
    const bopMetalnessMap = textureLoader.load('./assets/textures/bop-metallic.png');
    bopColorMap.flipY = bopNormalMap.flipY = bopMetalnessMap.flipY = false;
    bopColorMap.colorSpace = THREE.SRGBColorSpace;
    const bopMaterial = new THREE.MeshStandardMaterial({ 
        map: bopColorMap, normalMap: bopNormalMap, metalnessMap: bopMetalnessMap, 
        roughness: 0.4, metalness: 0.5 
    });

    // Load BOP - Blowout Preventer
    loader.load('./assets/models/BOP.glb', (gltf) => {
        const bop = gltf.scene;
        bop.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = child.receiveShadow = true;
                interactiveObjects.push(child);
                child.material = bopMaterial;
                child.userData = { name: "BOP", info: "A critical safety device used to prevent uncontrolled flow of formation fluids." };
            }
        });
        bop.scale.set(85, 85, 85);
        bop.position.set(0, -15, 0);
        rigGroup.add(bop);
        interactiveObjects.push(bop);
        checkAllLoaded();
    });

    // Load Choke Manifold
    loader.load('./assets/models/choke_manifold.glb', (gltf) => {
        const chokeManifold = gltf.scene;
        chokeManifold.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = child.receiveShadow = true;
                child.material = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.7, roughness: 0.5 });
                child.userData = { name: "Choke Manifold", info: "Controls flow rate and pressure during drilling operations." };
            }
        });
        chokeManifold.scale.set(40, 40, 40);
        chokeManifold.position.set(0, 20, -100);
        rigGroup.add(chokeManifold);
        interactiveObjects.push(chokeManifold);
        checkAllLoaded();
    });

    // Load Cementing Unit
    loader.load('./assets/models/cementing_unit.glb', (gltf) => {
        const cementingUnit = gltf.scene;
        cementingUnit.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = child.receiveShadow = true;
                child.userData = { name: "Cementing Unit", info: "Mixes and pumps cement slurry for well cementing operations." };
            }
        });
        cementingUnit.scale.set(120, 120, 120);
        cementingUnit.position.set(0, 80, -400);
        rigGroup.add(cementingUnit);
        interactiveObjects.push(cementingUnit);
        checkAllLoaded();
    });

    // Load Hydraulic Power Unit (HPU)
    loader.load('./assets/models/HPU.glb', (gltf) => {
        const hpu = gltf.scene;
        hpu.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = child.receiveShadow = true;
                child.userData = { name: "Hydraulic Power Unit (HPU)", info: "Provides hydraulic power to operate drilling equipment like top drive and BOP." };
            }
        });
        hpu.scale.set(80, 70, 70);
        hpu.position.set(200, 60, -300);
        rigGroup.add(hpu);
        interactiveObjects.push(hpu);
        checkAllLoaded();
    });

    // Load Cable Reels
    loader.load('./assets/models/cable_reels.glb', (gltf) => {
        const cableReels = gltf.scene;
        cableReels.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = child.receiveShadow = true;
                child.userData = { name: "Cable Reels", info: "Stores and dispenses electrical cables for drilling operations." };
            }
        });
        cableReels.scale.set(60, 60, 60);
        cableReels.position.set(240, 40, -80);
        rigGroup.add(cableReels);
        interactiveObjects.push(cableReels);
        checkAllLoaded();
    });

    // Load Hook
    loader.load('./assets/models/hook.glb', (gltf) => {
        const hook = gltf.scene;
        hook.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = child.receiveShadow = true;
                child.material = new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.6, roughness: 0.4 });
                child.userData = { name: "Hook", info: "Connects the traveling block to the top drive and supports the drill string." };
            }
        });
        hook.scale.set(120, 120, 120);
        hook.position.set(0, 210, 0);
        setTimeout(() => {
            if (topDriveGroup) hook.add(topDriveGroup);
        }, 100);
        rigGroup.add(hook);
        interactiveObjects.push(hook);
        checkAllLoaded();
    });

    // Load Pipe Rack
    loader.load('./assets/models/pipe_rack.glb', (gltf) => {
        const pipeRack = gltf.scene;
        pipeRack.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = child.receiveShadow = true;
                child.material = metalMaterial.clone();
                child.userData = { name: "Pipe Rack", info: "Stores drill pipes used for tripping operations.", target: pipeRack };
            }
            interactiveObjects.push(child);
        });
        pipeRack.scale.set(10, 10, 10);
        pipeRack.position.set(150, 50, -40);
        rigGroup.add(pipeRack);

        // Create pipe bundles for visual effect
        const pipes1 = createPipeBundle(5, 8);
        const pipes2 = createPipeBundle(5, 8);
        pipes1.position.set(0, 3, 2);
        pipes2.position.set(0, 5, 2);
        pipes1.rotation.y = pipes2.rotation.y = Math.PI / 2;
        pipes1.scale.set(0.8, 0.8, 0.8);
        pipes2.scale.set(0.8, 0.8, 0.8);
        pipeRack.add(pipes1);
        pipeRack.add(pipes2);
        pipes1.traverse(obj => { if (obj.isMesh) interactiveObjects.push(obj); });
        pipes2.traverse(obj => { if (obj.isMesh) interactiveObjects.push(obj); });
        checkAllLoaded();
    });
}

// Create a bundle of pipes for pipe rack
export function createPipeBundle(rows = 4, cols = 6) {
    const group = new THREE.Group();
    const pipeGeo = new THREE.CylinderGeometry(0.4, 0.4, 16, 12);
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.4 });
    
    for (let i = 0; i < rows * cols; i++) {
        const pipe = new THREE.Mesh(pipeGeo, pipeMat);
        pipe.rotation.z = Math.PI / 2;
        const x = (i % cols) * 1.0;
        const y = Math.floor(i / cols) * 0.9;
        pipe.position.set(x, y, 0);
        pipe.position.z = (Math.random() - 0.5) * 0.3;
        pipe.position.y += (Math.random() - 0.5) * 0.1;
        pipe.userData = { target: group, name: "Drill Pipes", info: "Stored drill pipes used during tripping operations." };
        group.add(pipe);
    }
    return group;
}