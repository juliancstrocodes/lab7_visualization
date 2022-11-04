import * as d3 from "https://unpkg.com/d3?module";

const margin = { top: 30, right: 20, bottom: 30, left: 20 };
const width = 850 - margin.left - margin.right,
	height = 700 - margin.top - margin.bottom;

d3.json("airports.json", d3.autoType).then((airports) => {
	d3.json("world-110m.json", d3.autoType).then((map) => {
		let svg = d3
			.select("body")
			.append("svg")
			.attr("width", width)
			.attr("height", height)
			.attr("viewBox", [0, 0, width, height]);

		let sizeRange = d3.extent(airports.nodes, (d) => d.passengers);

		const sizeScale = d3.scaleLinear().domain(sizeRange).range([3, 10]);

		airports.nodes.map(function (d) {
			d.r = sizeScale(d.passengers);
		});

		const feat = topojson.feature(map, map.objects.countries).features;

		const projection = d3.geoMercator().fitExtent(
			[
				[0, 0],
				[width, height],
			],
			topojson.feature(map, map.objects.countries)
		);

		const force = d3
			.forceSimulation()
			.nodes(airports.nodes)
			.force("charge", d3.forceManyBody().strength(-120))
			.force(
				"collide",
				d3.forceCollide().radius(function (d) {
					return d.r;
				})
			);

		force
			.force("yAxis", d3.forceY(height / 2))
			.force("xAxis", d3.forceX(width / 2));

		const drag = d3
			.drag()
			.on("start", (e) => {
				force.alphaTarget(0.3).restart();
				e.subject.fx = e.x;
				e.subject.fy = e.y;
			})
			.on("drag", (e) => {
				e.subject.fx = e.x;
				e.subject.fy = e.y;
			})
			.on("end", (e) => {
				force.alphaTarget(0.0);
				e.subject.fx = null;
				e.subject.fy = null;
			});

		svg.append("g")
			.selectAll("path")
			.data(feat)
			.enter()
			.append("path")
			.attr("d", d3.geoPath().projection(projection))
			.style("stroke", "#ffff")
			.attr("fill", "#F6F0ED");

		let links = svg
			.selectAll("line")
			.data(airports.links)
			.enter()
			.append("line")
			.attr("stroke-opacity", 1)
			.attr("stroke", "#C2948A");

		let nodes = svg
			.selectAll("circle")
			.data(airports.nodes)
			.join("circle")
			.attr("stroke-opacity", 0.5)
			.attr("stroke", "#28536B")
			.attr("r", (d) => d.r)
			.attr("fill", "#7EA8BE")
			.call(drag);

		nodes.append("title").text((d) => d.name);

		force.on("tick", () => {
			nodes
				.attr("cy", function (data) {
					return data.y;
				})
				.attr("cx", function (data) {
					return data.x;
				});

			links
				.attr("y1", function (data) {
					return airports.nodes[data.source].y;
				})
				.attr("y2", function (data) {
					return airports.nodes[data.target].y;
				})
				.attr("x1", function (data) {
					return airports.nodes[data.source].x;
				})
				.attr("x2", function (data) {
					return airports.nodes[data.target].x;
				});
		});

		svg.selectAll("path").attr("opacity", 0);
		let visType = d3.selectAll("input[name=typeButton]");

		function switchLayout() {
			if (event.target.value == "map") {
				svg.selectAll("path").attr("opacity", 1);
				force.stop();
				airports.nodes.forEach(function (d) {
					let position = projection([d.longitude, d.latitude]);
					d.x = position[0];
					d.y = position[1];
					nodes
						.transition()
						.duration(1500)
						.attr("cy", function (data) {
							return data.y;
						})
						.attr("cx", function (data) {
							return data.x;
						});

					links
						.transition()
						.duration(1500)
						.attr("x1", function (data) {
							return airports.nodes[data.source].x;
						})
						.attr("x2", function (data) {
							return airports.nodes[data.target].x;
						})
						.attr("y1", function (data) {
							return airports.nodes[data.source].y;
						})
						.attr("y2", function (data) {
							return airports.nodes[data.target].y;
						});
				});
				drag.filter(() => visType === "force");
			} else {
				force.alphaTarget(0.3).restart();
				//force.force("charge", d3.forceManyBody().strength(-120));
				svg.selectAll("path").attr("opacity", 0);
			}
		}

		d3.selectAll("input[name=typeButton]").on("change", () => {
			switchLayout();
		});
	});
});
