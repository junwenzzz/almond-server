// "use strict";

var width = 600,     // svg width
    height = 800,     // svg height
    dr = 10,      // default point radius
    off = 20,    // cluster hull offset
    data, net, force, hull, link, node;

var min_x = 150,
    max_x = 450,
    min_y = 10,
    max_y = 650;

var curve = d3.svg.line()
    .interpolate("cardinal-closed")
    .tension(.85);

var fill = d3.scale.category10();

function noop() { return false; }

function nodeid(n) {
return n.size ? "_g_"+n.group : n.name;
}

function linkid(l) {
var u = nodeid(l.source),
    v = nodeid(l.target);
return u<v ? u+"|"+v : v+"|"+u;
}

function linkid(l) {
var u = nodeid(l.source),
    v = nodeid(l.target);
return u<v ? u+"|"+v : v+"|"+u;
}

// constructs the network to visualize
function network(data, prev) {
var gm = {},    // group map
    nm = {},    // node map
    lm = {},    // relationship map
    nodes = [], // output nodes
    links = []; // output links

// determine nodes
for (var k=0; k<data.nodes.length; ++k) {
    var n = data.nodes[k],
        i = n.group,
        l = gm[i] || (gm[i]={group:i, size:0, nodes:[]});

    if (n.size) {
    // the ungrouped node should be directly visible
    nodes.push(n);

    } else {
    // the node is part of a collapsed cluster

    if (l.size == 0) {
        // if new cluster, add to set and position at centroid of leaf nodes
        nodes.push(l);
    }
    l.nodes.push(n);
    }
// always count group size as we also use it to tweak the force graph strengths/distances
    // l.size += 1;
    n.group_data = l;
}

// determine links
for (k=0; k<data.links.length; ++k) {
    var e = data.links[k],
        u = e.source,
        v = e.target,
        t = e.type;
        
    var i = (u<v ? u+"|"+v : v+"|"+u),
        l = lm[i] || (lm[i] = {source:u, target:v, type:t});
}
for (i in lm) { links.push(lm[i]); }

return {nodes: nodes, links: links};
}
function min_max(v, max_v, min_v){
if (v>max_v) return max_v;
else if (v<min_v) return min_v;
else return v;
}

function boundary(x=0,y=0){
if (x == 0){
    return min_max(y, max_y, min_y);
} else if(y == 0){
    return min_max(x, max_x, min_x);
} else{
    return 0;
}
}

function convexHulls(nodes, d_offset) {
var hulls = {};

// create point sets
for (var k=0; k<nodes.length; ++k) {
    var n = nodes[k];
    if (n.group == "na") continue;
    var i = n.group,
    offset = d_offset,
    l = hulls[i] || (hulls[i] = []);
    if(n.size == 0){
    offset = d_offset*4;
    }
    l.push([n.x-offset, n.y-offset]);
    l.push([n.x-offset, n.y+offset]);
    l.push([n.x+offset, n.y-offset]);
    l.push([n.x+offset, n.y+offset]);
}

// create convex hulls
var hullset = [];
for (i in hulls) {
    hullset.push({group: i, path: d3.geom.hull(hulls[i])});
}

return hullset;
}

function drawCluster(d) {
return curve(d.path); // 0.8
}

function id2node(id, nodes){
for (var k=0; k<nodes.length; ++k) {
    var n = nodes[k];
    if (n.id == id) {
    return k;
    }
}
return null;
}

function load_data(data){
    for (var i=0; i<data.links.length; ++i) {
    var o = data.links[i];
    // replace source_index by the node object
    o.source = id2node(o.source, data.nodes);
    o.target = id2node(o.target, data.nodes);
    }
    return data;
}
// --------------------------------------------------------

// var body = d3.select("body");
// var vis = body.append("svg")
var vis = d3.select("#bubbleDiagram").append("svg")
.attr("width", width)
.attr("height", height);

var json0 = {"nodes":[],"links":[]};
var json1 = {"nodes":[{"id":"working","name":"Working Zone","group":"working"}, {"id":"visitor","name":"Visitor Zone","group":"visitor"}, {"id":"social","name":"Social Zone","group":"social"}],"links":[]};
var json2 = {"nodes":[{"id":"working","name":"Working Zone","group":"working"}, {"id":"visitor","name":"Visitor Zone","group":"visitor"}, {"id":"social","name":"Social Zone","group":"social"}],"links":[{"source":"social", "target":"visitor", "value":1, "type":"near"}]};
var json3 = {"nodes":[{"id":"office1","name":"Office","group":"working","size":10},{"id":"office2","name":"Office","group":"working","size":10},{"id":"office3","name":"Office","group":"working","size":10},{"id":"office4","name":"Office","group":"working","size":10},{"id":"office5","name":"Office","group":"working","size":10},{"id":"desk1","name":"Desk","group":"working","size":15},{"id":"desk2","name":"Desk","group":"working","size":15},{"id":"desk3","name":"Desk","group":"working","size":15},{"id":"meet1","name":"Meeting","group":"working","size":20},{"id":"meet2","name":"Meeting","group":"working","size":20},{"id":"meet3","name":"Meeting","group":"working","size":20},{"id":"meet4","name":"Meeting","group":"working","size":20},{"id":"working","name":"Working Zone","group":"working"}, {"id":"visitor","name":"Visitor Zone","group":"visitor"}, {"id":"social","name":"Social Zone","group":"social"}],"links":[{"source":"social", "target":"visitor", "value":1, "type":"near"},{"source":"office1", "target":"working", "value":1, "type":"in_zone"},{"source":"office2", "target":"working", "value":1, "type":"in_zone"},{"source":"office3", "target":"working", "value":1, "type":"in_zone"},{"source":"office4", "target":"working", "value":1, "type":"in_zone"},{"source":"office5", "target":"working", "value":1, "type":"in_zone"}, {"source":"meet1", "target":"working", "value":1, "type":"in_zone"},{"source":"meet2", "target":"working", "value":1, "type":"in_zone"},{"source":"meet3", "target":"working", "value":1, "type":"in_zone"},{"source":"meet4", "target":"working", "value":1, "type":"in_zone"},{"source":"desk1", "target":"working", "value":1, "type":"in_zone"},{"source":"desk2", "target":"working", "value":1, "type":"in_zone"},{"source":"desk3", "target":"working", "value":1, "type":"in_zone"}]};
var json4 = {"nodes":[{"id":"window1","name":"Window","group":"na","size":2}, {"id":"window2","name":"Window","group":"na","size":2}, {"id":"window3","name":"Window","group":"na","size":2}, {"id":"window4","name":"Window","group":"na","size":2}, {"id":"window5","name":"Window","group":"na","size":2}, {"id":"office1","name":"Office","group":"working","size":10},{"id":"office2","name":"Office","group":"working","size":10},{"id":"office3","name":"Office","group":"working","size":10},{"id":"office4","name":"Office","group":"working","size":10},{"id":"office5","name":"Office","group":"working","size":10},{"id":"desk1","name":"Desk","group":"working","size":15},{"id":"desk2","name":"Desk","group":"working","size":15},{"id":"desk3","name":"Desk","group":"working","size":15},{"id":"meet1","name":"Meeting","group":"working","size":20},{"id":"meet2","name":"Meeting","group":"working","size":20},{"id":"meet3","name":"Meeting","group":"working","size":20},{"id":"meet4","name":"Meeting","group":"working","size":20},{"id":"working","name":"Working Zone","group":"working"}, {"id":"visitor","name":"Visitor Zone","group":"visitor"}, {"id":"social","name":"Social Zone","group":"social"}],"links":[{"source":"social", "target":"visitor", "value":1, "type":"near"},{"source":"office1", "target":"working", "value":1, "type":"in_zone"},{"source":"office2", "target":"working", "value":1, "type":"in_zone"},{"source":"office3", "target":"working", "value":1, "type":"in_zone"},{"source":"office4", "target":"working", "value":1, "type":"in_zone"},{"source":"office5", "target":"working", "value":1, "type":"in_zone"}, {"source":"meet1", "target":"working", "value":1, "type":"in_zone"},{"source":"meet2", "target":"working", "value":1, "type":"in_zone"},{"source":"meet3", "target":"working", "value":1, "type":"in_zone"},{"source":"meet4", "target":"working", "value":1, "type":"in_zone"},{"source":"desk1", "target":"working", "value":1, "type":"in_zone"},{"source":"desk2", "target":"working", "value":1, "type":"in_zone"},{"source":"desk3", "target":"working", "value":1, "type":"in_zone"},{"source":"office1", "target":"window1", "value":1, "type":"nearWin"},{"source":"office2", "target":"window2", "value":1, "type":"nearWin"},{"source":"office3", "target":"window3", "value":1, "type":"nearWin"},{"source":"office4", "target":"window4", "value":1, "type":"nearWin"},{"source":"office5", "target":"window5", "value":1, "type":"nearWin"}]};
var json5 = {"nodes":[{"id":"window1","name":"Window","group":"na","size":2}, {"id":"window2","name":"Window","group":"na","size":2}, {"id":"window3","name":"Window","group":"na","size":2}, {"id":"window4","name":"Window","group":"na","size":2}, {"id":"window5","name":"Window","group":"na","size":2}, {"id":"office1","name":"Office","group":"working","size":10},{"id":"office2","name":"Office","group":"working","size":10},{"id":"office3","name":"Office","group":"working","size":10},{"id":"office4","name":"Office","group":"working","size":10},{"id":"office5","name":"Office","group":"working","size":10},{"id":"desk1","name":"Desk","group":"working","size":15},{"id":"desk2","name":"Desk","group":"working","size":15},{"id":"desk3","name":"Desk","group":"working","size":15},{"id":"meet1","name":"Meeting","group":"working","size":20},{"id":"meet2","name":"Meeting","group":"working","size":20},{"id":"meet3","name":"Meeting","group":"working","size":20},{"id":"meet4","name":"Meeting","group":"working","size":20},{"id":"working","name":"Working Zone","group":"working"}, {"id":"visitor","name":"Visitor Zone","group":"visitor"}, {"id":"social","name":"Social Zone","group":"social"}],"links":[{"source":"social", "target":"visitor", "value":1, "type":"near"},{"source":"office1", "target":"working", "value":1, "type":"in_zone"},{"source":"office2", "target":"working", "value":1, "type":"in_zone"},{"source":"office3", "target":"working", "value":1, "type":"in_zone"},{"source":"office4", "target":"working", "value":1, "type":"in_zone"},{"source":"office5", "target":"working", "value":1, "type":"in_zone"}, {"source":"meet1", "target":"working", "value":1, "type":"in_zone"},{"source":"meet2", "target":"working", "value":1, "type":"in_zone"},{"source":"meet3", "target":"working", "value":1, "type":"in_zone"},{"source":"meet4", "target":"working", "value":1, "type":"in_zone"},{"source":"desk1", "target":"working", "value":1, "type":"in_zone_center"},{"source":"desk2", "target":"working", "value":1, "type":"in_zone_center"},{"source":"desk3", "target":"working", "value":1, "type":"in_zone_center"},{"source":"office1", "target":"window1", "value":1, "type":"nearWin"},{"source":"office2", "target":"window2", "value":1, "type":"nearWin"},{"source":"office3", "target":"window3", "value":1, "type":"nearWin"},{"source":"office4", "target":"window4", "value":1, "type":"nearWin"},{"source":"office5", "target":"window5", "value":1, "type":"nearWin"}]};

init(load_data(json0));

vis.attr("opacity", 1e-6)
.transition()
    .duration(1000)
    .attr("opacity", 1);

function init(data) {
    if (force) force.stop();

    net = network(data, net);

    force = d3.layout.force()
        .nodes(net.nodes)
        .links(net.links)
        .size([width, height])
        .linkDistance(function(l, i) {
        var n1 = l.source, n2 = l.target; // parameter in links
            // TBD: design algorithm for link distance
        var length = 200;
        if (l.type == "in_zone"){
            length = 10;
        }else if (l.type == "near"){
            length = 200;
        } else if(l.type== "nearWin"){
            length = 50;
        } else if(l.type== "in_zone_center"){
            length = 15;
        }
        return length;
        })
        .linkStrength(function(l, i) {
        var strength = 1;
        if (l.type == "in_zone"){
            strength = 0.2;
        } else if (l.type == "near"){
            strength = 1;
        } else if(l.type== "nearWin"){
            strength = 1;
        } else if(l.type== "in_zone_center"){
            strength = 0.7;
        }
        return strength;
        })
        .gravity(0.05)   // gravity+charge tweaked to ensure good 'grouped' view (e.g. green group not smack between blue&orange, ...
        .charge(-400)    // ... charge is important to turn single-linked groups to the outside
        .friction(0.5)   // friction adjusted to get dampened display: less bouncy bouncy ball [Swedish Chef, anyone?]
        .start();
    
    vis.selectAll("text").remove();

    vis.selectAll("path.hull").remove();
    hull = vis.selectAll("path.hull").data(convexHulls(net.nodes, off)).enter().append("g");
    var group = hull.append("path")
        .attr("class", "hull")
        .attr("d", drawCluster)
        .style("fill", function(d) { return fill(d.group); });

    var group_label = hull.append("text")
        .text(function(d) { return d.group+" zone"; })
        .style("text-anchor", "middle")
        .style("fill", function(d) { return fill(d.group); })
        .style("font-family", "Arial")
        .style("font-size", 25);
    
    vis.selectAll("line.link").remove();
    link = vis.selectAll("line.link").data(net.links, linkid).enter().append("g");
    
    var line = link.append("line")
        .attr("class", "link")
        .attr("x1", function(d) { return boundary(d.source.x, 0); })
        .attr("y1", function(d) { return boundary(0, d.source.y); })
        .attr("x2", function(d) { return boundary(d.target.x, 0); })
        .attr("y2", function(d) { return boundary(0, d.target.y); })
        .style("stroke-width", function(d) {
            var s_width = 2;
            if (d.type == "in_zone" || d.type == "in_zone_center"){
            s_width = 0;
            }
            return s_width;
        })
    
    var line_label = link.append("text")
        .text(function(d) {
            var text = d.type;
            if(d.type == "nearWin") {
            text = "near";
            }else if(d.type == "in_zone" || d.type == "in_zone_center") {
            text = "";
            }
            return text;
        })
        .style("text-anchor", "middle")
        .style("fill", "#3cba54")
        .style("font-family", "Arial")
        .style("font-size", function(d) {
            var font = 20;
            if(d.type == "nearWin"){
            font = 10;
            }
            return font; 
        });
    
    vis.selectAll("circle.node").remove();
    node = vis.selectAll("circle.node").data(net.nodes, nodeid).enter().append("g");
    // node.exit().remove();
    var circle = node.append("circle")
        // if (d.size) -- d.size > 0 when d is a group node.
        .attr("class", function(d) { return "node" + (d.group == "na" ?"":" leaf"); })
        .attr("r", function(d) {
            var r = dr;
            if(d.name == "Window"){
            r = r*0.6;
            } else if(d.name == "Office"){
            r = r*1.5;
            } else if(d.name == "Meeting"){
            r = r*2;
            }  else if(d.name == "Desk"){
            r = r*2;
            }
            return r; 
        })
        .attr("cx", function(d) { 
            return boundary(d.x, 0); })
        .attr("cy", function(d) { 
            return boundary(0, d.y); })
        .style("fill", function(d) {
            var color;
            if (d.group == "na" || d.size >0){
            if(d.name == "Window"){
                return "#F4B400";
            }
            color = fill(d.name);
            } else{
            color = fill(d.group);
            }
            return color; 
        });
    
    
    var node_label = node.append("svg:text")
        .text(function(d) {return d.group == "na" || d.size >0 ? d.name:""; })
        .style("text-anchor", "middle")
        .style("fill", function(d){
            if(d.name == "Window"){
            return "#F4B400";
            }
            return color = fill(d.name);
        })
        .style("font-family", "Arial")
        .style("font-size", function(d) {
            var font = 15;
            if(d.name == "Window"){
            font = 10;
            }
            return font; 
        });
    
    // node.on("click", update);
    node.call(force.drag);

    force.on("tick", function() {
        group.data(convexHulls(net.nodes, off))
            .attr("d", drawCluster);

        group_label.data(convexHulls(net.nodes, off))
                .attr("x", function(d) { return d.path[0][0]; })
                .attr("y", function(d) { return d.path[0][1]; });
        
        line.attr("x1", function(d) { return boundary(d.source.x, 0); })
            .attr("y1", function(d) { return boundary(0, d.source.y); })
            .attr("x2", function(d) { return boundary(d.target.x, 0); })
            .attr("y2", function(d) { return boundary(0, d.target.y); });

        line_label.attr("x", function(d) { return ((d.source.x + d.target.x)/2); })
                .attr("y", function(d) { return ((d.source.y + d.target.y)/2); });

        circle.attr("cx", function(d) { return boundary(d.x, 0); })
            .attr("cy", function(d) { return boundary(0, d.y); });
        
        node_label.attr("x", function(d) { return d.x; })
                .attr("y", function(d) { return d.y-8; });
    });
    }


// $(() => {
    // var width = 960,     // svg width
    //     height = 600,     // svg height
    //     dr = 10,      // default point radius
    //     off = 40,    // cluster hull offset
    //     data, net, force, hull, link, node;

    // var curve = d3.svg.line()
    //     .interpolate("cardinal-closed")
    //     .tension(.85);

    // var fill = d3.scale.category10();

    // function noop() { return false; }

    // function nodeid(n) {
    // return n.size ? "_g_"+n.group : n.name;
    // }

    // function linkid(l) {
    // var u = nodeid(l.source),
    //     v = nodeid(l.target);
    // return u<v ? u+"|"+v : v+"|"+u;
    // }

    // function linkid(l) {
    // var u = nodeid(l.source),
    //     v = nodeid(l.target);
    // return u<v ? u+"|"+v : v+"|"+u;
    // }

    // // constructs the network to visualize
    // function network(data, prev) {
    // var gm = {},    // group map
    //     nm = {},    // node map
    //     lm = {},    // relationship map
    //     nodes = [], // output nodes
    //     links = []; // output links

    // // determine nodes
    // for (var k=0; k<data.nodes.length; ++k) {
    //     var n = data.nodes[k],
    //         i = n.group,
    //         l = gm[i] || (gm[i]={group:i, size:0, nodes:[]});

    //     if (n.size) {
    //     // the ungrouped node should be directly visible
    //     nodes.push(n);

    //     } else {
    //     // the node is part of a collapsed cluster

    //     if (l.size == 0) {
    //         // if new cluster, add to set and position at centroid of leaf nodes
    //         nodes.push(l);
    //     }
    //     l.nodes.push(n);
    //     }
    // // always count group size as we also use it to tweak the force graph strengths/distances
    //     // l.size += 1;
    //     n.group_data = l;
    // }

    // // determine links
    // for (k=0; k<data.links.length; ++k) {
    //     var e = data.links[k],
    //         u = e.source,
    //         v = e.target,
    //         t = e.type;
            
    //     var i = (u<v ? u+"|"+v : v+"|"+u),
    //         l = lm[i] || (lm[i] = {source:u, target:v, type:t});
    // }
    // for (i in lm) { links.push(lm[i]); }

    // return {nodes: nodes, links: links};
    // }

    // function convexHulls(nodes, offset) {
    // var hulls = {};

    // // create point sets
    // for (var k=0; k<nodes.length; ++k) {
    //     var n = nodes[k];
    //     if (n.group == "na") continue;
    //     var i = n.group,
    //         l = hulls[i] || (hulls[i] = []);
    //     l.push([n.x-offset, n.y-offset]);
    //     l.push([n.x-offset, n.y+offset]);
    //     l.push([n.x+offset, n.y-offset]);
    //     l.push([n.x+offset, n.y+offset]);
    // }

    // // create convex hulls
    // var hullset = [];
    // for (i in hulls) {
    //     hullset.push({group: i, path: d3.geom.hull(hulls[i])});
    // }

    // return hullset;
    // }

    // function drawCluster(d) {
    // return curve(d.path); // 0.8
    // }

    // function id2node(id, nodes){
    // for (var k=0; k<nodes.length; ++k) {
    //     var n = nodes[k];
    //     if (n.id == id) {
    //     return k;
    //     }
    // }
    // return null;
    // }

    // // --------------------------------------------------------

    // var vis = d3.select("#bubbleDiagram").append("svg")
    // .attr("width", width)
    // .attr("height", height);

    // var json = {"nodes":[{"id":"entry1","name":"Entrance","group":"na","size":10}, {"id":"window1","name":"Window","group":"na","size":2}, {"id":"window2","name":"Window","group":"na","size":2}, {"id":"window3","name":"Window","group":"na","size":2}, {"id":"window4","name":"Window","group":"na","size":2}, {"id":"window5","name":"Window","group":"na","size":2},{"id":"office1","name":"Office","group":"working","size":10},{"id":"office2","name":"Office","group":"working","size":10},{"id":"office3","name":"Office","group":"working","size":10},{"id":"office4","name":"Office","group":"working","size":10},{"id":"office5","name":"Office","group":"working","size":10},{"id":"working","name":"Working Zone","group":"working"}, {"id":"visitor","name":"Visitor Zone","group":"visitor"}, {"id":"social","name":"Social Zone","group":"social"}],"links":[{"source":"entry1", "target":"visitor", "value":1, "type":"near"},{"source":"social", "target":"visitor", "value":1, "type":"near"},{"source":"working", "target":"social", "value":1, "type":"near"},{"source":"office1", "target":"working", "value":1, "type":"in_zone"},{"source":"office2", "target":"working", "value":1, "type":"in_zone"},{"source":"office3", "target":"working", "value":1, "type":"in_zone"},{"source":"office4", "target":"working", "value":1, "type":"in_zone"},{"source":"office5", "target":"working", "value":1, "type":"in_zone"}, {"source":"office1", "target":"window1", "value":1, "type":"nearWin"},{"source":"office2", "target":"window2", "value":1, "type":"nearWin"},{"source":"office3", "target":"window3", "value":1, "type":"nearWin"},{"source":"office4", "target":"window4", "value":1, "type":"nearWin"},{"source":"office5", "target":"window5", "value":1, "type":"nearWin"}]};
    // //TBD: link array {"source":"entry1", "target":"window1", "value":1, "type":"near"}
    // data = json;

    // for (var i=0; i<data.links.length; ++i) {
    // var o = data.links[i];
    // // replace source_index by the node object
    // o.source = id2node(o.source, data.nodes);
    // o.target = id2node(o.target, data.nodes);
    // }

    // init();

    // vis.attr("opacity", 1e-6)
    // .transition()
    //     .duration(1000)
    //     .attr("opacity", 1);

    // // --------------------------------------------------------

    // function init() {
    // if (force) force.stop();

    // net = network(data, net);

    // force = d3.layout.force()
    //     .nodes(net.nodes)
    //     .links(net.links)
    //     .size([width, height])
    //     .linkDistance(function(l, i) {
    //     var n1 = l.source, n2 = l.target; // parameter in links
    //         // TBD: design algorithm for link distance
    //         // default return 100
    //     var length = 150;
    //     if (l.type == "in_zone"){
    //         length = 30;
    //     } else if(l.type== "nearWin"){
    //         length = 20;
    //     }
    //     return length;
    //     })
    //     .linkStrength(function(l, i) {
    //     return 1;
    //     })
    //     .gravity(0.05)   // gravity+charge tweaked to ensure good 'grouped' view (e.g. green group not smack between blue&orange, ...
    //     .charge(-600)    // ... charge is important to turn single-linked groups to the outside
    //     .friction(0.5)   // friction adjusted to get dampened display: less bouncy bouncy ball [Swedish Chef, anyone?]
    //     .start();

    // // hullg.selectAll("path.hull").remove();
    // hull = vis.selectAll("path.hull").data(convexHulls(net.nodes, off)).enter().append("g");
    // var group = hull.append("path")
    //     .attr("class", "hull")
    //     .attr("d", drawCluster)
    //     .style("fill", function(d) { return fill(d.group); });

    // var group_label = hull.append("svg:text")
    //     .text(function(d) { return d.group+" zone"; })
    //     .style("text-anchor", "middle")
    //     .style("fill", function(d) { return fill(d.group); })
    //     .style("font-family", "Arial")
    //     .style("font-size", 25);

    // link = vis.selectAll("line.link").data(net.links, linkid).enter().append("g");
    // // link.exit().remove();
    // var line = link.append("line")
    //     .attr("class", "link")
    //     .attr("x1", function(d) { return d.source.x; })
    //     .attr("y1", function(d) { return d.source.y; })
    //     .attr("x2", function(d) { return d.target.x; })
    //     .attr("y2", function(d) { return d.target.y; })
    //     .style("stroke-width", function(d) { return d.type == "in_zone" ? 0 : 1; });
    
    // var line_label = link.append("svg:text")
    //     .text(function(d) {
    //         var text = d.type;
    //         if(d.type == "nearWin") {
    //         text = "near";
    //         }else if(d.type == "in_zone") {
    //         text = "";
    //         }
    //         return text;
    //     })
    //     .style("text-anchor", "middle")
    //     .style("fill", "#3cba54")
    //     .style("font-family", "Arial")
    //     .style("font-size", function(d) {
    //         var font = 20;
    //         if(d.type == "nearWin"){
    //         font = 10;
    //         }
    //         return font; 
    //     });
    
    // node = vis.selectAll("circle.node").data(net.nodes, nodeid).enter().append("g");
    // // node.exit().remove();
    // var circle = node.append("circle")
    //     // if (d.size) -- d.size > 0 when d is a group node.
    //     .attr("class", function(d) { return "node" + (d.group == "na" ?"":" leaf"); })
    //     .attr("r", function(d) {
    //         var r = dr;
    //         if(d.name == "Window"){
    //         r = r*0.6;
    //         } else if(d.group == "na"){
    //         r = r*1.2;
    //         }
    //         return r; 
    //     })
    //     .attr("cx", function(d) { return d.x; })
    //     .attr("cy", function(d) { return d.y; })
    //     .style("fill", function(d) {
    //         var color;
    //         if (d.group == "na" || d.size >0){
    //         if(d.name == "Window"){
    //             return "#F4B400";
    //         }
    //         color = fill(d.name);
    //         } else{
    //         color = fill(d.group);
    //         }
    //         return color; 
    //     });

    // var node_label = node.append("svg:text")
    //     .text(function(d) {return d.group == "na" || d.size >0 ? d.name:""; })
    //     .style("text-anchor", "middle")
    //     .style("fill", "#555")
    //     .style("font-family", "Arial")
    //     .style("font-size", function(d) {
    //         var font = 15;
    //         if(d.name == "Window"){
    //         font = 10;
    //         }
    //         return font; 
    //     });

    // node.call(force.drag);

    // force.on("tick", function() {
    //     group.data(convexHulls(net.nodes, off))
    //         .attr("d", drawCluster);

    //     group_label.data(convexHulls(net.nodes, off))
    //             .attr("x", function(d) { return d.path[0][0]; })
    //             .attr("y", function(d) { return d.path[0][1]; });
        
    //     line.attr("x1", function(d) { return d.source.x; })
    //         .attr("y1", function(d) { return d.source.y; })
    //         .attr("x2", function(d) { return d.target.x; })
    //         .attr("y2", function(d) { return d.target.y; });

    //     line_label.attr("x", function(d) { return ((d.source.x + d.target.x)/2); })
    //             .attr("y", function(d) { return ((d.source.y + d.target.y)/2); });

    //     circle.attr("cx", function(d) { return d.x; })
    //         .attr("cy", function(d) { return d.y; });
        
    //     node_label.attr("x", function(d) { return d.x; })
    //             .attr("y", function(d) { return d.y-8; });
    // });
    // }
// });