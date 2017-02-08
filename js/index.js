
var LoadBlance_topology = function() {
  var self = this;

  var icon = {
    'network': '\uf0c2',
    'loalBalance' : '\uf0ac',
    'instance': '\uf108'
  }

  var zoom = d3.behavior.zoom();
  var svgContainer = null;
  var root = null;

  var loading = function(svg_container) {

    svgContainer = svg_container;
    create_vis();
    force_lyout();

    d3.json("readme.json", function(error, json) {
      if (error) throw error;
      root = json;
      update_node();
    });


    angular.element(document)
      .on("mousedown", function(evt) {
        evt.preventDefault();

        if(!(evt.target.tagName.toLowerCase() === 'li')) {
          menu_methods = nodeEnterEvent.contextmenuMethonds.call(null);
          menu_methods.hiddenMenu();
          self.force.start();
        }

      });

  };

  var create_vis = function() {

    this.svg = d3.select(svgContainer).append("svg")
    .style("border", "1px solid #3182bd")
    .attr('pointer-events', 'all')
    .attr("width", '100%')
    .attr("height", '100%')
    .append('g')
    .call(zoom
        .scaleExtent([0.1,1.5])
        .on('zoom', function() {
            vis.attr('transform', 'translate(' + d3.event.translate + ')scale(' +
              zoom.scale() + ')');
            self.translate = d3.event.translate;
          })
        )
    .on('dblclick.zoom', null);
    svg.append('rect')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('fill', 'white');

    this.vis = svg.append("g");
  };

  var force_lyout = function() {
    this.force = d3.layout.force()
    .size([angular.element(svgContainer).width(),
             angular.element(svgContainer).height()])
    .on("tick", function(){
      self.vis.selectAll(".link").attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });

      self.vis.selectAll("g.node").attr("transform", function(d) {
        return "translate(" + d.x + "," + d.y + ")";
      });

      self.vis.selectAll("path.hulls").data(convex_hulls(self.svg.selectAll('g.node').data()))
        .attr('d', function(d) {
          return curve(d.path); })
        .enter().insert('path', 'g')
        .attr('class', 'hulls')
        .style('fill', function(d) {return fill(d.group);})
        .style('stroke', function(d) {return fill(d.group);})
        .style('stroke',"gray")
        .style('stroke-linejoin', 'round')
        .style('stroke-width', 2)
        .style('opacity', 0.2);
    });

    this.drag = this.force.drag()// node drag before zoom
        .origin(function(d) { return d; })
        .on("dragstart", function(d) {
          d3.event.sourceEvent.stopPropagation();
      });

    this.curve = d3.svg.line()
      .interpolate('cardinal-closed')
      .tension(0.85);

    this.fill = d3.scale.category10();

  };

  var update_node = function() {

    var link = this.vis.selectAll(".link"),
        node = this.vis.selectAll("g.node");

    var nodes = flatten(),
        links = d3.layout.tree().links(nodes);

    this.force
      .nodes(nodes)
      .links(links)
      .charge(-500)
      .gravity(0.05)
      .linkDistance(function(link) {
          return (link.source.id === root.id) ? 200 : 100})
      .start();

    link = link.data(links, function(d) { return d.target.id; });

    link.exit().remove();

    link.enter().insert("line", ".node")
      .attr("class", "link")
      .attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });

    node = node.data(nodes, function(d) { return d.id; });

    node.exit().remove();

    nodeEnter = node.enter()
            .append('g')
            .attr('class', 'node')
            .on("click", nodeEnterEvent.click)
            .on("mouseover", nodeEnterEvent.mouseover)
            .on("mouseout", nodeEnterEvent.mouseout)
            .on("contextmenu", nodeEnterEvent.contextmenu)
            .call(this.drag);

    nodeEnter.append("circle")
      .attr("r", function(d) {return d.children ? 30 : 25 })
      .attr("fill", function(d) {
        return d._children ? "#3182bd" : d.children ? "#CAE1FF" : "#EED2EE";
      });

    nodeEnter.append("text")
      .style('fill', '#3182bd')
      .style('font', '20px FontAwesome')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('transform',function(d) {
            switch (d.type) {
              case 'loalBalance':
                return 'scale(2.5)';
              case 'instance':
                return 'scale(1.5)';
              case 'client':
                return 'scale(1)';
            }
      })
      .text(function(d) {
        return icon[d.type];
      });

    nodeEnter.append('title')
      .text(function(d) {
        return d.name;
      })

    nodeEnter.append('text')
      .attr('class', 'nodeLabel')
      .style('display', 'inline')
      .style('fill','black')
      .style('stroke-width', 0)
      .text(function(d) { return d.id; })
      .attr('transform', 'translate(25,3)');

  };

  var convex_hulls = function(nodes) {
    var net, _i, _len, _ref, _h, i;
    var hulls = [];
    var k = 0;
    var offset = 40;

    while (k < nodes.length) {
      var n = nodes[k];
      if (n.type == "network") {
        _h = hulls[n.id] || (hulls[n.id] = [])
        _h.push([n.x - offset, n.y - offset]);
        _h.push([n.x - offset, n.y + offset]);
        _h.push([n.x + offset, n.y - offset]);
        _h.push([n.x + offset, n.y + offset]);

        _ref = n.children;

        if (_ref) {
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            net = _ref[_i];
            if (net.type == "instance") {
              _h.push([net.x - offset, net.y - offset]);
              _h.push([net.x - offset, net.y + offset]);
              _h.push([net.x + offset, net.y - offset]);
              _h.push([net.x + offset, net.y + offset]);
            }
          }
        }
      }
      ++k;
    }


    var hullset = [];
    for (i in hulls) {
      if ({}.hasOwnProperty.call(hulls, i)) {
        hullset.push({
          group: i,
          path: d3.geom.hull(hulls[i])
        });
      }
    }
    return hullset;
  };

  var flatten = function() {
    var nodes = [], i = 0;
    function recurse(node) {
      if (node.children) node.children.forEach(recurse); //递归
      if (!node.id) node.id = ++i;
      nodes.push(node);
    }
    recurse(root); //+id
    return nodes;
  };

  var nodeEnterEvent = {
    click: function(d) {
      if (d3.event.defaultPrevented) return;
      if (d.id==root.id) return;

      if (d.children) {
        d._children = d.children;
        d.children = null;
      } else {
        d.children = d._children;
        d._children = null;
      }
      update_node(root);
    },

    mouseover: function(d) {
      self.vis.selectAll('line.link').filter(function(z) {
        if (z.source === d || z.target === d) {
          return true;
        } else {
          return false;
        }
      }).style('stroke-width', '3px');
    },

    mouseout: function() {
      self.vis.selectAll('line.link')
        .style('stroke-width','1px');
    },

    contextmenu: function(d) {

      d3.event.preventDefault();
      self.force.stop();

      menu_methods = nodeEnterEvent.contextmenuMethonds.call(null);
      menu_methods.hiddenMenu();

      menu_methods.showMenu(angular.element(this), d);

      return false;
    },

    contextmenuMethonds: function() {
      var menu = null;

      function nodeMenu() {
        function doSomethings(evt) {
          alert(evt)
          evt.stopPropagation();
        }

        return [{
          text: 'test1',
          method: doSomethings
        },{
          text: 'test2',
          method: doSomethings
        }]
      }

      function createMenu(menuContent) {
        var menu = document.createElement('ul');
        menu.setAttribute('id', 'menu');
        menu.setAttribute('class', 'context-menu');
        menu.setAttribute('oncontextmenu', 'return false');

        for (var i = 0; i< menuContent.length; i++) {
          var li = document.createElement('li');
          li.innerHTML = menuContent[i].text;
          li.onclick = menuContent[i].method;
          li.onmouseover = liMouseover;
          li.onmouseout = liMouseout;
          li.setAttribute('class', 'context-menu-li');
          li.setAttribute('oncontextmenu', 'return false');
          menu.appendChild(li);
        }

        function liMouseover(evt) {
          evt.target.style.backgroundColor = 'rgba(212, 212, 111, 0.3)';
          evt.target.style.boxShadow = '1px 1px 2px rgba(0, 0, 0, 0.55)';
        }

        function liMouseout(evt) {
          evt.target.style.backgroundColor = '';
          evt.target.style.boxShadow = '';
        }

        return menu;
      }

      function showMenu(evt, d) {

        if(!menu) {
          menu = createMenu(nodeMenu());
          angular.element(svgContainer).append(menu);
        }

        var xn = d.x, yn = d.y;

        if (self.translate) {
          xn = self.translate[0] + d.x * zoom.scale();
          yn = self.translate[1] + d.y * zoom.scale();
        }

        menu.style.display = 'block';
        menu.style.left = xn + 'px';
        menu.style.top = yn + 'px';

      }

      function hiddenMenu() {
        if(angular.element('#menu').length) {
          angular.element('#menu').remove();
        }
      }

      return {
        showMenu: showMenu,
        hiddenMenu: hiddenMenu
      };

    },

  };

  return {
    init: function(svg_container) {
      loading(svg_container);
    }
  }

}();

LoadBlance_topology.init('#svgContainer')






