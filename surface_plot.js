var container, scene, camera, renderer, controls;

loader = new THREE.JSONLoader();
loader.parse = function(c, f){return {geometry: c, materials: null}};
loader.load("https://www.quandl.com/api/v3/datasets/USTREASURY/YIELD.json?api_key=BfxTz7RbdM5qMw8sbJds&collapse=monthly", function( data ){
    init(data);
    initAxis(data);
    initGraph(data);
    animate();
});

function init(data){
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 1000 );
    camera.position.z = 100;
    camera.position.x = -dateToPos(moment(data.dataset.data[data.dataset.data.length-1][0]).startOf('year'))/2;
    camera.position.y = (data.dataset.column_names.length-1)*10;

    scene.add(camera);
    camera.up = new THREE.Vector3(0,0,1);

    renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    container = document.getElementById('stage');
    container.appendChild(renderer.domElement);

    var light=new THREE.AmbientLight(0xdddddd);
    scene.add(light);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
	controls.dampingFactor = 0.25;
    controls.target = new THREE.Vector3(dateToPos(moment(data.dataset.data[data.dataset.data.length-1][0]).startOf('year'))/2,-(data.dataset.column_names.length-1)*5,0);
    controls.minDistance = 50;
    controls.maxDistance = 500;
    controls.maxPolarAngle=Math.PI/2;

    renderer.setClearColor( 0xffffff, 1 );
    window.addEventListener( 'resize', onWindowResize, false );
}

function initAxis(data){
    var minDate = moment(data.dataset.data[data.dataset.data.length-1][0]).startOf('year');
    var xend = dateToPos(minDate);

    for(var i=1;i<data.dataset.column_names.length;i+=1){
        makeLine(scene, new THREE.Vector3(0,-i*10,0), new THREE.Vector3(xend,-i*10,0));
        drawText(scene, new THREE.Vector3(-20,-i*10,0), data.dataset.column_names[i], Math.PI);
    }

    var years = moment().diff(minDate,'years');

    var x = dateToPos(minDate);
    for(var i=0; i<=years;i++){
        makeLine(scene, new THREE.Vector3(x,0,0), new THREE.Vector3(x,-110,0));
        drawText(scene, new THREE.Vector3(x,0,0), minDate.year(), -Math.PI/2);
        x = dateToPos(minDate.add(1,'years'));
    }
}

function drawText(scene, pos, text, rotation){
    var text2d = new THREE_Text.Text2D(text, { align: THREE_Text.textAlign.right, font: '40px Arial', fillStyle: '#000000'})

    text2d.scale.set(0.1,0.1,0.1);
    text2d.position.set(pos.x+2,pos.y,pos.z);
    text2d.rotateZ(rotation);
    scene.add(text2d);
}

function dateToPos(date){
    return (moment().unix() - date.unix())/2592000;
}

function makeLine(scene, v1, v2, color){
    var material = new THREE.LineBasicMaterial({
    	color: color || 0xCCCCCC
    });

    var geometry = new THREE.Geometry();
    geometry.vertices.push(v1,v2);

    var line = new THREE.Line( geometry, material );
    scene.add( line );
}

function initGraph(rawdata){
    data = initData(rawdata)
    var geometry = new THREE.Geometry();
    var colors = [];

    var height = data.length, width = data[0].length;
    data.forEach(function(col){
    	col.forEach(function(val){
    	    geometry.vertices.push(new THREE.Vector3(val.x,val.y,val.z))
    	    colors.push(getColor(10,0,val.z));
    	});
    });

    for(var x=0;x<height-1;x++){
    	for(var y=0;y<width-1;y++){
            if(checkValidData(geometry,x,y,width)){
                makePolygon(geometry,colors,offset(x,y,width),offset(x+1,y,width),offset(x,y+1,width));
                makePolygon(geometry,colors,offset(x+1,y,width),offset(x+1,y+1,width),offset(x,y+1,width));

                makeLine(scene, geometry.vertices[offset(x,y,width)], geometry.vertices[offset(x+1,y,width)], 0x333333);
            }
    	}
        if(checkValidData(geometry,x,y,width))
            makeLine(scene, geometry.vertices[offset(x,y,width)], geometry.vertices[offset(x+1,y,width)], 0x333333);
    }

    var material = new THREE.MeshLambertMaterial({ vertexColors: THREE.VertexColors});
    var mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
}

function makePolygon(geometry,colors,p1,p2,p3){
    var vec0 = new THREE.Vector3();
    var vec1 = new THREE.Vector3();
    var n_vec = new THREE.Vector3();

    vec0.subVectors(geometry.vertices[p1],geometry.vertices[p2]);
    vec1.subVectors(geometry.vertices[p1],geometry.vertices[p3]);
    n_vec.crossVectors(vec0,vec1).normalize();
    geometry.faces.push(new THREE.Face3(p1,p2,p3, n_vec, [colors[p1],colors[p2],colors[p3]]));
    geometry.faces.push(new THREE.Face3(p1,p3,p2, n_vec.negate(), [colors[p1],colors[p3],colors[p2]]));
}

function offset(x,y,width){
       return x*width+y;
}

function checkValidData(geometry,x,y,width){
    return !(geometry.vertices[offset(x,y,width)].z <= -100 ||
            geometry.vertices[offset(x+1,y,width)].z <= -100 ||
            geometry.vertices[offset(x,y+1,width)].z <= -100 ||
            geometry.vertices[offset(x+1,y+1,width)].z <= -100);
}

function getColor(max,min,val){
    var aval = Math.min(max,Math.abs(val));
    var l = 1-((aval - min)/(max - min))*.5;

    var color = new THREE.Color();
    var h = 0.4;

    if(val<0)
        h = 1;

    var s = 0.5;
    color.setHSL(h,s,l);
    return color;
}

function initData(rawdata){
    var dataset = rawdata.dataset.data;
    var data = new Array();
    for(var x=0;x<dataset.length;x++){
    	var row = [];
        var date = dateToPos(moment(dataset[x][0]))
    	for(var y=1;y<dataset[x].length;y++){
            var z = Number(dataset[x][y]);
            if(isNaN(z) || dataset[x][y] === null)
    	        row.push({x: date, y: -y*10, z: -100});
            else {
                row.push({x: date, y: -y*10, z: z*10});
            }
    	}
    	data.push(row);
    }
    return data;
}

function onWindowResize(){
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate(){
    requestAnimationFrame(animate);
    render();
    controls.update();
}

function render(){
    renderer.render(scene, camera);
}
