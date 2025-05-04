import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const VisualizationPage = () => {
  const svgRef = useRef();

  useEffect(() => {
    // Mock data (replace with actual API call to fetch from Cassandra)
    const data = [
      { brand: 'Peugeot', count: 120 },
      { brand: 'Renault', count: 90 },
      { brand: 'Volkswagen', count: 70 },
      { brand: 'Toyota', count: 50 },
      { brand: 'BMW', count: 40 },
      { brand: 'Audi', count: 30 },
      { brand: 'Mercedes-Benz', count: 25 },
      { brand: 'Dacia', count: 20 }
    ];

    // Set dimensions and margins
    const margin = { top: 40, right: 30, bottom: 70, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Clear any existing SVG content
    d3.select(svgRef.current).selectAll('*').remove();

    // Create SVG container
    const svg = d3
      .select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Set scales
    const x = d3
      .scaleBand()
      .domain(data.map(d => d.brand))
      .range([0, width])
      .padding(0.2);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, d => d.count)])
      .range([height, 0])
      .nice();

    // Add X axis
    svg
      .append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .style('font-size', '12px');

    // Add Y axis
    svg
      .append('g')
      .call(d3.axisLeft(y))
      .style('font-size', '12px');

    // Add bars
    svg
      .selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.brand))
      .attr('y', d => y(d.count))
      .attr('width', x.bandwidth())
      .attr('height', d => height - y(d.count))
      .attr('fill', '#FFDD67')
      .on('mouseover', function (event, d) {
        d3.select(this).attr('fill', '#d97706');
        svg
          .append('text')
          .attr('class', 'tooltip')
          .attr('x', x(d.brand) + x.bandwidth() / 2)
          .attr('y', y(d.count) - 10)
          .attr('text-anchor', 'middle')
          .style('font-size', '14px')
          .style('fill', '#333')
          .text(d.count);
      })
      .on('mouseout', function () {
        d3.select(this).attr('fill', '#FFDD67');
        svg.select('.tooltip').remove();
      });

    // Add chart title
    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .text('Number of Cars by Brand');

    // Add X axis label
    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', height + 60)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Brand');

    // Add Y axis label
    svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -40)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Number of Cars');
  }, []);

  return (
    <div className="container py-5">
      <h1 className="text-center fw-bold mb-5">Car Data Visualizations</h1>
      <div className="d-flex justify-content-center">
        <svg ref={svgRef}></svg>
      </div>
      <p className="text-center mt-4 text-muted">
        This chart shows the distribution of cars by brand in our databa
      </p>
    </div>
  );
};

export default VisualizationPage;