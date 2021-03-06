/*
1. set main used variables 
    are you used for setting selected features and urls

2. initialize mapbox and setup the map
    also handles style changes (eg default and satellite)

3. get data method

4. map setup method 
    loads data into mapbox layers

5. redoStatusFilters method
    hides already fixed issues

6. setStatus method
    sets a status for an issue (also authenticates)

7. showFeatureDetails method
    shows features on a still hidden side panel

8. hideSidePanel method
    hides the side panel

9. showSidePanel method
    shows side panel

10. Handle authentication button clicks
    #authenticate = login button

11. Handle note form
    
12. get_polygon_centroid
*/

const url = "https://road-completion.osm.be/backend/API/";
//const url = "http://localhost:3000/API/";
const token = 'pk.eyJ1IjoieGl2ayIsImEiOiJaQXc3QUJFIn0.nLL2yBYQbAQfhMBC-FIyXg';
let map;
let fixedIssues;
let unfixedIssies = [];
let selectedHash = '';
let selectedFeature = null;

$(document).ready(function () {

    mapboxgl.accessToken = token;

    map = new mapboxgl.Map({
        container: 'map', // container id
        style: 'mapbox://styles/mapbox/streets-v9',
        // style: 'mapbox://styles/mapbox/satellite-v9',
        // style: 'mapbox://styles/xivk/cjdd899nbbm7y2spdd9xq6xil', // stylesheet location
        center: [4.380068778991699, 50.85095984723529], // starting position [lng, lat]
        zoom: 14, // starting zoom
        hash: true
    });

    //change style
    $('#default-style').click(function () {
        map = new mapboxgl.Map({
            container: 'map', // container id
            style: 'mapbox://styles/mapbox/streets-v9',
            // style: 'mapbox://styles/mapbox/satellite-v9',
            // style: 'mapbox://styles/xivk/cjdd899nbbm7y2spdd9xq6xil', // stylesheet location
            center: [4.380068778991699, 50.85095984723529], // starting position [lng, lat]
            zoom: 14, // starting zoom
            hash: true
        });
        mapSetup();
    });

    $('#satellite-style').click(function () {
        map = new mapboxgl.Map({
            container: 'map', // container id
            //style: 'mapbox://styles/mapbox/streets-v9',
            style: 'mapbox://styles/mapbox/satellite-v9',
            // style: 'mapbox://styles/xivk/cjdd899nbbm7y2spdd9xq6xil', // stylesheet location
            center: [4.380068778991699, 50.85095984723529], // starting position [lng, lat]
            zoom: 14, // starting zoom
            hash: true
        });
        mapSetup();
    });

    $.get(url + "ISSUES", function (data) {
        fixedIssues = data;
        $.get(url + "NONEISSUES", function (data2) {
            unfixedIssies = data2;

        });
        mapSetup();
    });



});

function getData() {
    $.get(url + "ISSUES", function (data) {
        fixedIssues = data;
        $.get(url + "NONEISSUES", function (data2) {
            unfixedIssies = data2;
            redoStatusFilters();

        });
    });




}

function mapSetup() {
    // Add zoom and rotation controls to the map.
    map.addControl(new mapboxgl.NavigationControl(), 'top-left');

    map.on("load", function () {

        var layers = map.getStyle().layers;

        // Find the index of the first symbol layer in the map style
        var firstSymbolId;
        for (var i = 0; i < layers.length; i++) {
            if (layers[i].id.includes("road")) {
                firstSymbolId = layers[i].id;
                break;
            }
        }

        map.addSource("diffs", {
            "type": "vector",
            "tiles": [
                //"http://roads-tiles.osm.be/data/diffs/{z}/{x}/{y}.pbf"
                "https://road-completion.osm.be/vector-tiles/diffs-tiles/{z}/{x}/{y}.pbf"
            ],
            "maxzoom": 14
        });


        map.addLayer({
            "id": "diffs-details",
            "source": "diffs",
            "source-layer": "diffs",
            "type": "line",
            "paint": {
                "line-color": "red",
                "line-width": 10,
                "line-opacity": 0.2
            },
            "minzoom": 16
        });

        map.addLayer({
            "id": "diffs",
            "source": "diffs",
            "source-layer": "diffs",
            "type": "line",
            "paint": {
                "line-color": "red",
                "line-width": 4
            },
            "maxzoom": 16
        });

        map.addLayer({
            "id": "diffs-details-hover",
            "source": "diffs",
            "source-layer": "diffs",
            "type": "line",
            "paint": {
                "line-color": "red",
                "line-width": 15,
                "line-opacity": 0.5
            },
            "filter": ["==", "id", ""],
            "minzoom": 16
        });

        map.addLayer({
            "id": "diffs-hover",
            "type": "line",
            "source": "diffs",
            "source-layer": "diffs",
            "paint": {
                "line-color": "red",
                "line-width": 6
            },
            "filter": ["==", "id", ""],
            "maxzoom": 16
        });

        redoStatusFilters();
    });

    var selectedFeature = "";

    map.on('click', function (e) {
        // reset currently selected feature.
        if (selectedFeature) {
            map.setFilter("diffs-hover", ["==", "id", ""]);
            map.setFilter("diffs-details-hover", ["==", "id", ""]);
            selectedFeature = "";
            hideSidePanel();
        }

        // search in small box around click location.
        var point = e.point;
        var width = 10;
        var height = 20;
        var features = map.queryRenderedFeatures([
            [point.x - width / 2, point.y - height / 2],
            [point.x + width / 2, point.y + height / 2]],
            { layers: ["diffs", "diffs-details"] });

        if (features && features[0] && features[0].properties && features[0].properties.id) {

            if (selectedFeature) {
                map.setFilter("diffs-hover", ["==", "id", ""]);
                map.setFilter("diffs-details-hover", ["==", "id", ""]);
                selectedFeature = "";
            }


            selectedFeature = features[0].properties.id;

            map.setFilter("diffs-hover", ["==", "id", selectedFeature]);
            map.setFilter("diffs-details-hover", ["==", "id", selectedFeature]);

            showFeatureDetails(features);
            showSidePanel();

        }

        if (!selectedFeature) {
            document.getElementById('features').innerHTML = "";
        }
    });
}

function redoStatusFilters() {
    var fixedFilter = [];
    fixedFilter.push("!in");
    fixedFilter.push("id");
    fixedIssues.forEach(function (fixedIssue) {
        fixedFilter.push(fixedIssue.hash);
    });

    map.setFilter("diffs", fixedFilter);
    map.setFilter("diffs-details", fixedFilter);
}

function setStatus(feature, status, callback) {

    let token = localStorage.getItem('https://www.openstreetmap.orgoauth_token');
    let secret = localStorage.getItem('https://www.openstreetmap.orgoauth_token_secret');
    let data = {
        hash: '' + feature.properties.id,
        status: status,
        c_key: consumer_key,
        c_scrt: consumer_secret,
        token: token.slice(1, -1),
        secret: secret.slice(1, -1),
        user_id: userid,
        street: feature.properties.name,
        city: feature.properties.postal_code
    };

    $.ajax({
        type: "POST",
        url: url + "ISSUE",
        data: data,
        success: function () {
            getData();
            callback();
        },
        dataType: 'json'
    });
}

function showFeatureDetails(features) {

    selectedHash = features[0].properties['id'];
    selectedFeature = features[0];
    //console.log(get_polygon_centroid(features[0].geometry.coordinates));


    let status = '';
    let note = '';
    let noteLink = '';
    $.each(fixedIssues, function (i, iss) {
        let id = features[0].properties['id'];
        if (iss.hash == id) {
            status = '<p class="status-mark-' + iss.status + '">' + iss.status + '</p>';
        }

    });

    $.each(unfixedIssies, function (i, iss) {
        let id = features[0].properties['id'];
        if (iss.hash == id) {
            note = iss.note;
            noteLink = 'https://master.apis.dev.openstreetmap.org/note/' + iss.noteId;
        }
    });


    console.log(features[0].properties);
    

    document.getElementById('features').innerHTML = `
    <div id="slidehead" class="slide-head">
        <h2 class="slide-text">Info</h2>`+ status + `
    </div>`;
    document.getElementById('features').innerHTML += '<hr>';
    document.getElementById('features').innerHTML += '<p class="slide-text"><b>Street: </b>' + features[0].properties.name + '</p>';
  
    document.getElementById('features').innerHTML += '<p class="slide-text"><b>Postalcode: </b>' + features[0].properties.postal_code + '</p>';

  
    document.getElementById('features').innerHTML += '<a target="_blank" href="https://www.openstreetmap.org/edit#map=' + map.getZoom() * 1.1 + '/' + map.getCenter()["lat"] + '/' + map.getCenter()["lng"] + '" class="edit-btn btn btn-primary">Edit</a>';


    if (auth.authenticated()) {
        document.getElementById('features').innerHTML += `
            <hr>
            <div class="dropdown">
                <a class="status-btn btn btn-secondary dropdown-toggle" href="#" role="button" id="dropdownMenuLink" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                    Set a status
                </a>
            
                <div class="dropdown-menu" aria-labelledby="dropdownMenuLink">
                    <a class="dropdown-item" href="#" id="fixedStatus">Fixed</a>
                    <a class="dropdown-item" href="#" id="falsePositiveStatus">False positive</a>
                    <a class="dropdown-item" href="#" id="difficultStatus">Too Difficult</a>
                    </div>
            </div>
        `;


        if (note != '') {
            document.getElementById('features').innerHTML += `
                <hr>
                <div id="noteDiv">
                    <div id="noteAlert" class="alert alert-warning" role="alert">
                        ${note}
                        <a style="font-size: 0.7em" href="${noteLink}" target="_blank">Link to note</a>
                    </div>
                </div>
            `;
        } else {
            document.getElementById('features').innerHTML += `
            <hr>
                <div id="noteDiv">
                    <div id="noteAlert" class="text-center">
                        <button style="font-size: 0.7em" data-toggle="modal" data-target="#noteModal">Add a note to this issue</button>
                    </div>
                </div>
            `;
        }
    } else {
        document.getElementById('features').innerHTML += `
            <hr>
                <button id="not-loggedin-btn" class="status-btn btn btn-secondary "  >
                    Set a status (Please log in)
                </button>
        `;



    }


    



    document.getElementById('features').innerHTML += `
        <div id="fixed-alert" class="alert alert-success" role="alert">
            This issue has been marked as fixed
        </div>
    `;


    $("#not-loggedin-btn").click(function () {
        auth.authenticate(function () {
            update();
            hideSidePanel();
            showFeatureDetails(features);
            showSidePanel();
        });
    });




    $('#fixedStatus').click(
        function (e) {
            if (confirm("Please confirm you want to mark the issue as fixed")) {
                //mark as fixed
                setStatus(features[0], 'fixed', function callback() {
                    document.getElementById('fixed-alert').style.opacity = 1;
                    document.getElementById('slidehead').innerHTML += '<p class="status-mark-fixed">Fixed</p>';
                    setTimeout(function () {
                        document.getElementById('fixed-alert').style.opacity = 0;
                    }, 3000);
                });

            } else {
                //canceled
            }
        }
    );

    $('#falsePositiveStatus').click(
        function (e) {
            if (confirm("Please confirm you want to mark the issue as a false positive")) {
                //mark as fixed
                setStatus(features[0], 'false-pos', function () {
                    document.getElementById('fixed-alert').innerHTML = "The issue has been marked as a false possitive";
                    document.getElementById('slidehead').innerHTML += '<p class="status-mark-false-pos">False Positive</p>';
                    document.getElementById('fixed-alert').style.opacity = 1;
                    setTimeout(function () {
                        document.getElementById('fixed-alert').style.opacity = 0;
                    }, 3000);
                });

            } else {
                //canceled
            }
        }
    );

    $('#difficultStatus').click(
        function (e) {
            if (confirm("Please confirm you want to mark the issue as too difficult")) {
                //mark as fixed
                setStatus(features[0], 'difficult', function () {
                    document.getElementById('fixed-alert').innerHTML = "The issue has been marked as too difficult";
                    document.getElementById('slidehead').innerHTML += '<p class="status-mark-difficult">Difficult</p>';
                    document.getElementById('fixed-alert').style.opacity = 1;
                    setTimeout(function () {
                        document.getElementById('fixed-alert').style.opacity = 0;
                    }, 3000);
                });

            } else {
                //canceled
            }
        }
    );
}

function hideSidePanel() {
    selectedHash = '';
    selectedFeature = null;
    document.getElementById("features").style.width = "0px";
    document.getElementById("features").style.padding = "0px";
    document.getElementById("features").style.paddingTop = "0px";
}

function showSidePanel() {
    document.getElementById("features").style.width = "30%";
    document.getElementById("features").style.padding = "30px";
    document.getElementById("features").style.paddingTop = "90px";
}


//hande login and logout buttons
document.getElementById('authenticate').onclick = function () {
    auth.authenticate(function () {
        //update method is inside auth-layout.js
        update();
        hideSidePanel();
        showFeatureDetails(features);
        showSidePanel();
    });
};

document.getElementById('logout').onclick = function () {
    //update method & auth.logout is inside auth-layout.js
    auth.logout();
    update();
    hideSidePanel();
    showFeatureDetails(features);
    showSidePanel();
};


//sumbit note form 
$("#addNoteForm").submit(function (event) {
    console.log("form submitted");
    console.log($("textarea:first").val());

    event.preventDefault();

    let token = localStorage.getItem('https://www.openstreetmap.orgoauth_token');
    let secret = localStorage.getItem('https://www.openstreetmap.orgoauth_token_secret');
    let centeroid = get_polygon_centroid(selectedFeature.geometry.coordinates);
    let lon = centeroid.geometry.coordinates[0];
    let lat = centeroid.geometry.coordinates[1];

    let data = {
        c_key: consumer_key,
        c_scrt: consumer_secret,
        token: token.slice(1, -1),
        secret: secret.slice(1, -1),
        "lat": lat,
        "lon": lon,
        "text": $("textarea:first").val(),
        "hash": selectedHash
    };

    console.log(data);
    

    

    $('#noteProgress').attr('aria-valuenow', 500).css('width',500);
    
    $.ajax({
        type: "POST",
        url: url + 'notes',
        data: data,
        success: function (data) {


            let note = '';
            let noteLink = '';
            console.log(data);

            note = data.note;
            noteLink = 'https://master.apis.dev.openstreetmap.org/note/' + data.noteId;

            $('#noteModal').modal('hide');
            if (note != '') {
                document.getElementById('noteDiv').innerHTML = `
                    <div id="noteAlert" class="alert alert-warning" role="alert">
                        ${note}
                        <a style="font-size: 0.7em" href="${noteLink}" target="_blank">Link to note</a>
                    </div>
                `;
                getData();
            } else {
                document.getElementById('noteDiv').innerHTML = `
                    <div id="noteAlert" class="text-center">
                        <button style="font-size: 0.7em" data-toggle="modal" data-target="#noteModal">Add a note to this issue</button>
                    </div>
                `;
            }

            $("textarea:first").val('')
        },
        dataType: 'json'
    });
});

//calculate the center of a polygon by geomotry
function get_polygon_centroid(pts) {    
    try{
        var polygon = turf.polygon(pts);
        return center =  turf.centroid(polygon);
    }catch(err){
        var polygon = turf.polygon(pts[0]);
        return center =  turf.centroid(polygon);
    }
 }
