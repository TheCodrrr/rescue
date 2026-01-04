import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend
} from 'chart.js';
import { Doughnut, Pie } from 'react-chartjs-2';
import { fetchAnalytics } from './auth/redux/analyticsSlice';
import {
    BarChart3,
    CheckCircle,
    Activity,
    Loader,
    AlertTriangle,
    FileText,
    Target,
    MapPin
} from 'lucide-react';
import './Analytics.css';

// Register ChartJS components
ChartJS.register(
    ArcElement,
    Tooltip,
    Legend
);

const Analytics = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { data: categoryData, isLoading: loading, error } = useSelector((state) => state.analytics);
    const trendChartRef = useRef(null);
    const bubbleMapRef = useRef(null);

    useEffect(() => {
        dispatch(fetchAnalytics());
    }, [dispatch]);

    // D3.js Gradient Line Chart for Complaint Trends
    useEffect(() => {
        if (!categoryData?.complaintsByDate || !trendChartRef.current) return;

        // Clear previous chart
        d3.select(trendChartRef.current).selectAll("*").remove();

        const data = categoryData.complaintsByDate.map(d => ({
            date: new Date(d.date),
            count: d.count
        }));

        // Chart dimensions
        const containerWidth = trendChartRef.current.clientWidth;
        const width = containerWidth || 800;
        const height = 300;
        const marginTop = 30;
        const marginRight = 30;
        const marginBottom = 50;
        const marginLeft = 50;

        // Create scales
        const x = d3.scaleUtc()
            .domain(d3.extent(data, d => d.date))
            .range([marginLeft, width - marginRight]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.count) || 10]).nice()
            .range([height - marginBottom, marginTop]);

        // Color scale for gradient (based on count)
        const colorScale = d3.scaleSequential()
            .domain([0, d3.max(data, d => d.count) || 10])
            .interpolator(d3.interpolateRgbBasis(['#10b981', '#00ADB5', '#8b5cf6', '#ec4899', '#ef4444']));

        // Create the line generator
        const line = d3.line()
            .curve(d3.curveMonotoneX)
            .x(d => x(d.date))
            .y(d => y(d.count));

        // Create SVG
        const svg = d3.select(trendChartRef.current)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [0, 0, width, height])
            .attr("style", "max-width: 100%; height: auto;");

        // Create gradient definition
        const gradientId = `line-gradient-${Date.now()}`;
        const gradient = svg.append("defs")
            .append("linearGradient")
            .attr("id", gradientId)
            .attr("gradientUnits", "userSpaceOnUse")
            .attr("x1", marginLeft)
            .attr("y1", 0)
            .attr("x2", width - marginRight)
            .attr("y2", 0);

        // Add gradient stops based on data
        data.forEach((d, i) => {
            gradient.append("stop")
                .attr("offset", `${(i / (data.length - 1)) * 100}%`)
                .attr("stop-color", colorScale(d.count));
        });

        // Add X axis
        svg.append("g")
            .attr("transform", `translate(0,${height - marginBottom})`)
            .call(d3.axisBottom(x)
                .ticks(d3.timeWeek.every(1))
                .tickFormat(d3.timeFormat("%b %d")))
            .call(g => g.select(".domain").attr("stroke", "#374151"))
            .call(g => g.selectAll(".tick line").attr("stroke", "#374151"))
            .call(g => g.selectAll(".tick text")
                .attr("fill", "#94a3b8")
                .attr("font-size", "10px")
                .attr("transform", "rotate(-45)")
                .attr("text-anchor", "end")
                .attr("dx", "-0.5em")
                .attr("dy", "0.5em"));

        // Add Y axis
        svg.append("g")
            .attr("transform", `translate(${marginLeft},0)`)
            .call(d3.axisLeft(y).ticks(5))
            .call(g => g.select(".domain").attr("stroke", "#374151"))
            .call(g => g.selectAll(".tick line").attr("stroke", "#374151"))
            .call(g => g.selectAll(".tick text").attr("fill", "#94a3b8"));

        // Add Y axis label
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 12)
            .attr("x", -(height / 2))
            .attr("fill", "#94a3b8")
            .attr("font-size", "12px")
            .attr("text-anchor", "middle")
            .text("Complaints");

        // Add grid lines
        svg.append("g")
            .attr("class", "grid")
            .attr("transform", `translate(${marginLeft},0)`)
            .call(d3.axisLeft(y)
                .ticks(5)
                .tickSize(-(width - marginLeft - marginRight))
                .tickFormat(""))
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll(".tick line")
                .attr("stroke", "#1e293b")
                .attr("stroke-dasharray", "2,2"));

        // Add area fill with gradient
        const area = d3.area()
            .curve(d3.curveMonotoneX)
            .x(d => x(d.date))
            .y0(height - marginBottom)
            .y1(d => y(d.count));

        svg.append("path")
            .datum(data)
            .attr("fill", `url(#${gradientId})`)
            .attr("fill-opacity", 0.15)
            .attr("d", area);

        // Add the line path
        svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", `url(#${gradientId})`)
            .attr("stroke-width", 2.5)
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("d", line);

        // Add dots at data points
        svg.selectAll(".dot")
            .data(data)
            .join("circle")
            .attr("class", "dot")
            .attr("cx", d => x(d.date))
            .attr("cy", d => y(d.count))
            .attr("r", 4)
            .attr("fill", d => colorScale(d.count))
            .attr("stroke", "#1e293b")
            .attr("stroke-width", 2)
            .style("cursor", "pointer")
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr("r", 7);
                
                // Show tooltip
                const tooltip = svg.append("g")
                    .attr("class", "tooltip-group")
                    .attr("transform", `translate(${x(d.date)},${y(d.count) - 15})`);

                tooltip.append("rect")
                    .attr("x", -40)
                    .attr("y", -30)
                    .attr("width", 80)
                    .attr("height", 28)
                    .attr("rx", 4)
                    .attr("fill", "rgba(0,0,0,0.85)")
                    .attr("stroke", colorScale(d.count))
                    .attr("stroke-width", 1);

                tooltip.append("text")
                    .attr("text-anchor", "middle")
                    .attr("y", -12)
                    .attr("fill", "#fff")
                    .attr("font-size", "11px")
                    .text(`${d3.timeFormat("%b %d")(d.date)}: ${d.count}`);
            })
            .on("mouseout", function() {
                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr("r", 4);
                svg.selectAll(".tooltip-group").remove();
            });

    }, [categoryData]);

    // D3.js Bubble Map for Complaint Locations with Geographic Map
    useEffect(() => {
        if (!categoryData?.nearbyComplaintCoordinates || !bubbleMapRef.current) return;

        // Clear previous chart
        d3.select(bubbleMapRef.current).selectAll("*").remove();

        const data = categoryData.nearbyComplaintCoordinates;
        if (data.length === 0) return;

        // Chart dimensions
        const containerWidth = bubbleMapRef.current.clientWidth;
        const width = containerWidth || 800;
        const height = 500;

        // Calculate center and bounds from data
        const lngExtent = d3.extent(data, d => d.longitude);
        const latExtent = d3.extent(data, d => d.latitude);
        const centerLng = (lngExtent[0] + lngExtent[1]) / 2;
        const centerLat = (latExtent[0] + latExtent[1]) / 2;

        // Calculate appropriate scale based on data spread
        const lngSpread = lngExtent[1] - lngExtent[0];
        const latSpread = latExtent[1] - latExtent[0];
        const maxSpread = Math.max(lngSpread, latSpread, 2); // Minimum spread of 2 degrees
        const scale = Math.min(width, height) / maxSpread * 40; // Lower multiplier for more zoom out

        // Create projection centered on data
        const projection = d3.geoMercator()
            .center([centerLng, centerLat])
            .scale(scale)
            .translate([width / 2, height / 2]);

        const pathGenerator = d3.geoPath().projection(projection);

        // Category colors matching the rest of the app
        const categoryColorMap = {
            rail: '#00ADB5',
            road: '#10b981',
            fire: '#ef4444',
            cyber: '#8b5cf6',
            police: '#f59e0b',
            court: '#ec4899'
        };

        // Count complaints per location (for bubble size)
        const locationCounts = {};
        data.forEach(d => {
            const key = `${d.longitude.toFixed(3)},${d.latitude.toFixed(3)}`;
            if (!locationCounts[key]) {
                locationCounts[key] = { 
                    longitude: d.longitude, 
                    latitude: d.latitude, 
                    count: 0, 
                    categories: {} 
                };
            }
            locationCounts[key].count++;
            locationCounts[key].categories[d.category] = (locationCounts[key].categories[d.category] || 0) + 1;
        });

        const aggregatedData = Object.values(locationCounts).map(loc => ({
            ...loc,
            dominantCategory: Object.entries(loc.categories).sort((a, b) => b[1] - a[1])[0][0]
        }));

        // Size scale for bubbles
        const sizeExtent = d3.extent(aggregatedData, d => d.count);
        const size = d3.scaleSqrt()
            .domain([1, Math.max(sizeExtent[1], 1)])
            .range([6, 30]);



        // Create SVG
        const svg = d3.select(bubbleMapRef.current)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [0, 0, width, height])
            .attr("style", "max-width: 100%; height: auto; border-radius: 8px;");

        // Add gradient background for ocean
        const defs = svg.append("defs");
        
        const oceanGradient = defs.append("radialGradient")
            .attr("id", "ocean-gradient")
            .attr("cx", "50%")
            .attr("cy", "50%")
            .attr("r", "70%");
        
        oceanGradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#1a3a52");
        oceanGradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#0f172a");

        // Background
        svg.append("rect")
            .attr("width", width)
            .attr("height", height)
            .attr("fill", "url(#ocean-gradient)");

        // Create a group for the map
        const mapGroup = svg.append("g").attr("class", "map-group");

        // Loading indicator
        const loadingText = svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .attr("fill", "#64748b")
            .attr("font-size", "14px")
            .text("Loading map...");

        // Fetch GeoJSON map data - using reliable sources
        const indiaStatesUrl = "https://gist.githubusercontent.com/jbrobst/56c13bbbf9d97d187fea01ca62ea5112/raw/e388c4cae20aa53cb5090210a42ebb9b765c0a36/india_states.geojson";
        const worldGeoJsonUrl = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";

        // Function to render the map and bubbles
        const renderMap = (geoData) => {
            loadingText.remove();

            // Draw the map
            mapGroup.selectAll("path")
                .data(geoData.features)
                .join("path")
                .attr("d", pathGenerator)
                .attr("fill", "#1e3a5f")
                .attr("stroke", "#2d4a6f")
                .attr("stroke-width", 0.5)
                .attr("opacity", 0.8)
                .on("mouseover", function() {
                    d3.select(this)
                        .attr("fill", "#2a4d6e")
                        .attr("stroke", "#3d6a8f");
                })
                .on("mouseout", function() {
                    d3.select(this)
                        .attr("fill", "#1e3a5f")
                        .attr("stroke", "#2d4a6f");
                });

            // Add graticule (grid lines)
            const graticule = d3.geoGraticule()
                .step([2, 2]);

            svg.append("path")
                .datum(graticule)
                .attr("class", "graticule")
                .attr("d", pathGenerator)
                .attr("fill", "none")
                .attr("stroke", "#1e3a5f")
                .attr("stroke-width", 0.3)
                .attr("stroke-opacity", 0.5);

            // Add complaint bubbles
            svg.selectAll(".complaint-bubble")
                .data(aggregatedData.sort((a, b) => b.count - a.count))
                .join("circle")
                .attr("class", "complaint-bubble")
                .attr("cx", d => {
                    const pos = projection([d.longitude, d.latitude]);
                    return pos ? pos[0] : 0;
                })
                .attr("cy", d => {
                    const pos = projection([d.longitude, d.latitude]);
                    return pos ? pos[1] : 0;
                })
                .attr("r", 0)
                .attr("fill", d => categoryColorMap[d.dominantCategory] || '#6b7280')
                .attr("fill-opacity", 0.7)
                .attr("stroke", d => categoryColorMap[d.dominantCategory] || '#6b7280')
                .attr("stroke-width", 2)
                .attr("stroke-opacity", 1)
                .style("cursor", "pointer")
                .style("filter", d => `drop-shadow(0 2px 6px ${categoryColorMap[d.dominantCategory]}40)`)
                .transition()
                .duration(500)
                .delay((d, i) => i * 30)
                .attr("r", d => size(d.count));

            // Add interactivity after animation
            setTimeout(() => {
                svg.selectAll(".complaint-bubble")
                    .on("mouseover", function(event, d) {
                        d3.select(this)
                            .transition()
                            .duration(150)
                            .attr("fill-opacity", 1)
                            .attr("r", size(d.count) * 1.3);

                        // Create tooltip
                        const pos = projection([d.longitude, d.latitude]);
                        const bubbleRadius = size(d.count);
                        const tooltipHeight = 64;
                        const tooltipMargin = 15;
                        
                        // Check if tooltip would overflow at the top
                        const wouldOverflowTop = pos[1] - bubbleRadius - tooltipMargin - tooltipHeight - 10 < 0;
                        
                        // Position tooltip below if it would overflow top, otherwise above
                        const tooltipY = wouldOverflowTop 
                            ? pos[1] + bubbleRadius + tooltipMargin  // Below the circle
                            : pos[1] - bubbleRadius - tooltipMargin; // Above the circle
                        
                        const tooltip = svg.append("g")
                            .attr("class", "map-tooltip")
                            .attr("transform", `translate(${pos[0]},${tooltipY})`);

                        const categoryText = Object.entries(d.categories)
                            .map(([cat, count]) => `${cat}: ${count}`)
                            .join(" • ");

                        const coordsText = `${d.latitude.toFixed(4)}°, ${d.longitude.toFixed(4)}°`;
                        const tooltipWidth = Math.max(140, Math.max(categoryText.length, coordsText.length) * 5.5 + 20);

                        // Tooltip background - adjust Y position based on direction
                        const bgY = wouldOverflowTop ? 4 : -68;
                        tooltip.append("rect")
                            .attr("x", -tooltipWidth / 2)
                            .attr("y", bgY)
                            .attr("width", tooltipWidth)
                            .attr("height", tooltipHeight)
                            .attr("rx", 6)
                            .attr("fill", "rgba(15, 23, 42, 0.95)")
                            .attr("stroke", categoryColorMap[d.dominantCategory])
                            .attr("stroke-width", 2)
                            .style("filter", "drop-shadow(0 4px 12px rgba(0,0,0,0.4))");

                        // Tooltip arrow - flip direction based on position
                        tooltip.append("path")
                            .attr("d", wouldOverflowTop 
                                ? "M-6,0 L0,-8 L6,0"  // Arrow pointing up
                                : "M-6,0 L0,8 L6,0")  // Arrow pointing down
                            .attr("fill", "rgba(15, 23, 42, 0.95)")
                            .attr("transform", wouldOverflowTop 
                                ? "translate(0, 4)" 
                                : "translate(0, -4)");

                        // Complaint count - adjust Y based on direction
                        tooltip.append("text")
                            .attr("text-anchor", "middle")
                            .attr("y", wouldOverflowTop ? bgY + 18 : -50)
                            .attr("fill", "#fff")
                            .attr("font-size", "13px")
                            .attr("font-weight", "700")
                            .text(`${d.count} Complaint${d.count > 1 ? 's' : ''}`);

                        // Category breakdown - adjust Y based on direction
                        tooltip.append("text")
                            .attr("text-anchor", "middle")
                            .attr("y", wouldOverflowTop ? bgY + 34 : -34)
                            .attr("fill", "#94a3b8")
                            .attr("font-size", "10px")
                            .text(categoryText);

                        // Coordinates - adjust Y based on direction
                        tooltip.append("text")
                            .attr("text-anchor", "middle")
                            .attr("y", wouldOverflowTop ? bgY + 50 : -18)
                            .attr("fill", "#64748b")
                            .attr("font-size", "9px")
                            .text(coordsText);
                    })
                    .on("mouseout", function(event, d) {
                        d3.select(this)
                            .transition()
                            .duration(150)
                            .attr("fill-opacity", 0.7)
                            .attr("r", size(d.count));
                        svg.selectAll(".map-tooltip").remove();
                    });
            }, aggregatedData.length * 30 + 600);

            // Add legend
            const categories = [...new Set(data.map(d => d.category))];
            const legendX = width - 130;
            const legendY = 15;

            const legend = svg.append("g")
                .attr("class", "legend")
                .attr("transform", `translate(${legendX}, ${legendY})`);

            legend.append("rect")
                .attr("x", -12)
                .attr("y", -12)
                .attr("width", 125)
                .attr("height", categories.length * 24 + 20)
                .attr("rx", 8)
                .attr("fill", "rgba(15, 23, 42, 0.85)")
                .attr("stroke", "#374151")
                .attr("stroke-width", 1)
                .style("backdrop-filter", "blur(8px)");

            legend.append("text")
                .attr("x", 50)
                .attr("y", 4)
                .attr("text-anchor", "middle")
                .attr("fill", "#94a3b8")
                .attr("font-size", "10px")
                .attr("font-weight", "600")
                .text("CATEGORIES");

            categories.forEach((category, i) => {
                const legendItem = legend.append("g")
                    .attr("transform", `translate(0, ${i * 24 + 20})`);

                legendItem.append("circle")
                    .attr("r", 7)
                    .attr("fill", categoryColorMap[category] || '#6b7280')
                    .attr("fill-opacity", 0.8)
                    .attr("stroke", categoryColorMap[category] || '#6b7280')
                    .attr("stroke-width", 1);

                legendItem.append("text")
                    .attr("x", 14)
                    .attr("y", 4)
                    .attr("fill", "#e2e8f0")
                    .attr("font-size", "12px")
                    .attr("text-transform", "capitalize")
                    .text(category);
            });

            // Add user location marker with distinct styling (rendered last for highest z-index)
            if (user?.latitude && user?.longitude) {
                const userPos = projection([parseFloat(user.longitude), parseFloat(user.latitude)]);
                if (userPos && !isNaN(userPos[0]) && !isNaN(userPos[1])) {
                    // Create a group for user marker
                    const userGroup = svg.append("g")
                        .attr("class", "user-marker-group")
                        .attr("transform", `translate(${userPos[0]}, ${userPos[1]})`);

                    // Outer glow ring (animated pulse) - white color
                    const pulseRing = userGroup.append("circle")
                        .attr("r", 8)
                        .attr("fill", "none")
                        .attr("stroke", "#fff")
                        .attr("stroke-width", 2)
                        .attr("stroke-opacity", 0.8);

                    // Animate the pulse ring
                    function pulseAnimation() {
                        pulseRing
                            .attr("r", 8)
                            .attr("stroke-opacity", 0.8)
                            .transition()
                            .duration(1500)
                            .attr("r", 20)
                            .attr("stroke-opacity", 0)
                            .on("end", pulseAnimation);
                    }
                    pulseAnimation();

                    // Small filled white circle with hover interaction
                    const userCircle = userGroup.append("circle")
                        .attr("r", 6)
                        .attr("fill", "#fff")
                        .style("filter", "drop-shadow(0 0 4px rgba(255,255,255,0.8))")
                        .style("cursor", "pointer");

                    // Add hover events for user marker
                    userCircle
                        .on("mouseover", function() {
                            d3.select(this)
                                .transition()
                                .duration(150)
                                .attr("r", 8);

                            const coordsText = `${parseFloat(user.latitude).toFixed(4)}°, ${parseFloat(user.longitude).toFixed(4)}°`;
                            const tooltipWidth = 140;
                            const tooltipHeight = 44;
                            
                            // Check if tooltip would overflow at the top
                            const wouldOverflowTop = userPos[1] - 30 - tooltipHeight < 0;
                            const tooltipY = wouldOverflowTop ? 20 : -20;

                            const tooltip = userGroup.append("g")
                                .attr("class", "user-tooltip")
                                .attr("transform", `translate(0, ${tooltipY})`);

                            const bgY = wouldOverflowTop ? 4 : -48;
                            tooltip.append("rect")
                                .attr("x", -tooltipWidth / 2)
                                .attr("y", bgY)
                                .attr("width", tooltipWidth)
                                .attr("height", tooltipHeight)
                                .attr("rx", 6)
                                .attr("fill", "rgba(15, 23, 42, 0.95)")
                                .attr("stroke", "#fff")
                                .attr("stroke-width", 2)
                                .style("filter", "drop-shadow(0 4px 12px rgba(0,0,0,0.4))");

                            tooltip.append("path")
                                .attr("d", wouldOverflowTop 
                                    ? "M-6,0 L0,-8 L6,0"
                                    : "M-6,0 L0,8 L6,0")
                                .attr("fill", "rgba(15, 23, 42, 0.95)")
                                .attr("transform", wouldOverflowTop 
                                    ? "translate(0, 4)" 
                                    : "translate(0, -4)");

                            tooltip.append("text")
                                .attr("text-anchor", "middle")
                                .attr("y", wouldOverflowTop ? bgY + 18 : -30)
                                .attr("fill", "#fff")
                                .attr("font-size", "12px")
                                .attr("font-weight", "700")
                                .text("Your Location");

                            tooltip.append("text")
                                .attr("text-anchor", "middle")
                                .attr("y", wouldOverflowTop ? bgY + 34 : -14)
                                .attr("fill", "#94a3b8")
                                .attr("font-size", "10px")
                                .text(coordsText);
                        })
                        .on("mouseout", function() {
                            d3.select(this)
                                .transition()
                                .duration(150)
                                .attr("r", 6);
                            userGroup.selectAll(".user-tooltip").remove();
                        });
                }
            }

        };

        // Fetch the map data
        d3.json(indiaStatesUrl)
            .then(geoData => {
                if (geoData && geoData.features && geoData.features.length > 0) {
                    renderMap(geoData);
                } else {
                    throw new Error("Invalid GeoJSON");
                }
            })
            .catch((err) => {
                console.log("India map failed, trying world map:", err);
                // Fallback to world map if India map fails
                d3.json(worldGeoJsonUrl)
                    .then(geoData => {
                        if (geoData && geoData.features && geoData.features.length > 0) {
                            renderMap(geoData);
                        } else {
                            throw new Error("Invalid world GeoJSON");
                        }
                    })
                    .catch((err2) => {
                        console.log("World map also failed:", err2);
                        // Render without map background - just show bubbles
                        loadingText.remove();
                        
                        // Add a simple grid as fallback
                        const gridGroup = svg.append("g").attr("class", "fallback-grid");
                        for (let x = 0; x <= width; x += 50) {
                            gridGroup.append("line")
                                .attr("x1", x).attr("y1", 0)
                                .attr("x2", x).attr("y2", height)
                                .attr("stroke", "#1e3a5f")
                                .attr("stroke-width", 0.5)
                                .attr("stroke-opacity", 0.3);
                        }
                        for (let y = 0; y <= height; y += 50) {
                            gridGroup.append("line")
                                .attr("x1", 0).attr("y1", y)
                                .attr("x2", width).attr("y2", y)
                                .attr("stroke", "#1e3a5f")
                                .attr("stroke-width", 0.5)
                                .attr("stroke-opacity", 0.3);
                        }
                        
                        // Still render the bubbles without map
                        renderMap({ features: [] });
                    });
            });

    }, [categoryData, user]);

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: 'spring',
                stiffness: 100
            }
        }
    };

    // Chart configurations
    const categoryColors = {
        rail: '#00ADB5',
        road: '#10b981',
        fire: '#ef4444',
        cyber: '#8b5cf6',
        police: '#f59e0b',
        court: '#ec4899'
    };

    const statusColors = {
        pending: '#f59e0b',
        in_progress: '#00ADB5',
        resolved: '#10b981',
        rejected: '#ef4444'
    };

    // Default colors for any category not explicitly defined
    const defaultColors = ['#00ADB5', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16'];

    // Category Distribution Chart (Doughnut) - using data from /analytics/category
    const categoryChartData = categoryData?.categoryDistribution ? (() => {
        // Transform object format { rail: 5, fire: 3, ... } to array format
        const categories = Object.entries(categoryData.categoryDistribution)
            .filter(([_, count]) => count > 0) // Only show categories with complaints
            .map(([category, count]) => ({ category, count }));
        
        // If no categories have complaints, return null
        if (categories.length === 0) return null;
        
        return {
            labels: categories.map(c => c.category.toUpperCase()),
            datasets: [{
                data: categories.map(c => c.count),
                backgroundColor: categories.map((c, index) => 
                    categoryColors[c.category] || defaultColors[index % defaultColors.length]
                ),
                borderColor: '#1e293b',
                borderWidth: 2,
                hoverOffset: 10
            }]
        };
    })() : null;

    // Status Distribution Chart (Pie)
    const statusChartData = categoryData?.statusDistribution ? {
        labels: categoryData.statusDistribution.map(s => 
            s.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
        ),
        datasets: [{
            data: categoryData.statusDistribution.map(s => s.count),
            backgroundColor: categoryData.statusDistribution.map(s => statusColors[s.status]),
            borderColor: '#1e293b',
            borderWidth: 2
        }]
    } : null;

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    color: '#fff',
                    font: {
                        size: 12,
                        family: "'Inter', sans-serif"
                    },
                    padding: 15,
                    usePointStyle: true
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                borderWidth: 1,
                padding: 12,
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.parsed || 0;
                        const dataset = context.dataset.data;
                        const total = dataset.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${label}: ${value} (${percentage}%)`;
                    }
                }
            }
        }
    };

    if (loading) {
        return (
            <div className="analytics-loading">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                    <Loader size={48} className="loading-icon" />
                </motion.div>
                <p>Loading analytics data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="analytics-error">
                <AlertTriangle size={48} className="error-icon" />
                <h3>Failed to Load Analytics</h3>
                <p>{error}</p>
                <button onClick={() => dispatch(fetchAnalytics())} className="retry-btn">
                    Try Again
                </button>
            </div>
        );
    }

    if (!categoryData || categoryData.totalComplaints === 0) {
        return (
            <div className="analytics-empty">
                <MapPin size={64} className="empty-icon" />
                <h3>No Data Available</h3>
                <p>No complaints found within 300km of your location.</p>
                <p className="empty-subtitle">Make sure your profile has location information.</p>
            </div>
        );
    }

    return (
        <motion.div
            className="analytics-container"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header Section */}
            <motion.div className="analytics-header" variants={itemVariants}>
                <div className="header-content">
                    <div className="header-icon-container">
                        <BarChart3 size={32} />
                    </div>
                    <div>
                        <h1 className="analytics-title">Area Analytics</h1>
                        <p className="analytics-subtitle">
                            Complaints within 300km radius • {categoryData?.totalComplaints || 0} total complaints
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <motion.div className="stats-grid" variants={itemVariants}>
                <motion.div className="stat-card">
                    <div className="stat-icon total">
                        <FileText size={24} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Total Complaints</p>
                        <h3 className="stat-value">{categoryData?.totalComplaints || 0}</h3>
                    </div>
                </motion.div>

                <motion.div className="stat-card">
                    <div className="stat-icon resolved">
                        <CheckCircle size={24} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Resolution Rate</p>
                        <h3 className="stat-value">{categoryData?.resolutionRate || 0}%</h3>
                    </div>
                </motion.div>

                <motion.div className="stat-card">
                    <div className="stat-icon user">
                        <Target size={24} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Your Complaints</p>
                        <h3 className="stat-value">{categoryData?.userComplaintsCount || 0}</h3>
                    </div>
                </motion.div>

                <motion.div className="stat-card">
                    <div className="stat-icon engagement">
                        <Activity size={24} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Engagement Rate</p>
                        <h3 className="stat-value">{categoryData?.engagementStats?.engagementRate || 0}%</h3>
                    </div>
                </motion.div>
            </motion.div>

            {/* Charts Grid */}
            <div className="charts-grid">
                {/* Category Distribution */}
                <motion.div className="chart-card" variants={itemVariants}>
                    <div className="chart-header">
                        <h3 className="chart-title">Category Distribution</h3>
                        <p className="chart-subtitle">Complaints by category</p>
                    </div>
                    <div className="chart-container">
                        {categoryChartData && (
                            <Doughnut data={categoryChartData} options={doughnutOptions} />
                        )}
                    </div>
                </motion.div>

                {/* Status Distribution */}
                <motion.div className="chart-card" variants={itemVariants}>
                    <div className="chart-header">
                        <h3 className="chart-title">Status Breakdown</h3>
                        <p className="chart-subtitle">Current complaint status</p>
                    </div>
                    <div className="chart-container">
                        {statusChartData && (
                            <Pie data={statusChartData} options={doughnutOptions} />
                        )}
                    </div>
                </motion.div>

                {/* Time Series - D3.js Gradient Line Chart */}
                <motion.div className="chart-card chart-wide" variants={itemVariants}>
                    <div className="chart-header">
                        <h3 className="chart-title">Complaint Trends</h3>
                        <p className="chart-subtitle">Daily complaint volume (Last 60 days)</p>
                    </div>
                    <div className="chart-container d3-chart-container" ref={trendChartRef}>
                        {!categoryData?.complaintsByDate && (
                            <p style={{ color: '#94a3b8', textAlign: 'center', paddingTop: '100px' }}>
                                No trend data available
                            </p>
                        )}
                    </div>
                </motion.div>

                {/* Bubble Map - Complaint Locations */}
                <motion.div className="chart-card chart-wide" variants={itemVariants}>
                    <div className="chart-header">
                        <div className="chart-header-with-icon">
                            <MapPin size={20} className="chart-header-icon" />
                            <div>
                                <h3 className="chart-title">Complaint Hotspots</h3>
                                <p className="chart-subtitle">Geographic distribution of complaints within 300km</p>
                            </div>
                        </div>
                    </div>
                    <div className="chart-container bubble-map-container" ref={bubbleMapRef}>
                        {!categoryData?.nearbyComplaintCoordinates?.length && (
                            <div className="no-map-data">
                                <MapPin size={32} className="no-data-icon" />
                                <p>No location data available</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default Analytics;
