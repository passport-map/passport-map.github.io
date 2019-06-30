(function () {
  const kinds = ['', 'vf', 'voa', 'eta', 'vr'];
  const fullKinds = ['', 'visa free', 'visa on arrival', 'eTA', 'visa required'];
  const types = ['', 'eVisa', 'eVisitors', 'free visa on arrival', 'tourist card', 'tourist registration',
    'trump ban', 'pre-enrollment', 'visa on arrival / eVisa', 'EVW', 'free eVisa', 'visa waiver registration',
    'pre-visa on arrival', 'not admitted', 'eVisa by email', 'visa on arrival (by email)', 'eVisa (fast track)'];
  const terms = ['', '7 days', '14 days', '90 days', '28 days', '30 days', '180 days', '360 days', '31 days',
    '-', undefined, undefined, '60 days', '15 days', '120 days', '240 days', '45 days', '21 days', '42 days'];
  const colors = { vf: '#0c0', voa: '#00f', eta: '#f80', vr: '#f00' };

  const width = window.innerWidth;
  const height = window.innerHeight;

  const projection = d3.geoMercator()
    .translate([width / 2, height / 1.7])
    .scale((width - 1) / 2 / Math.PI);

  const path = d3.geoPath()
    .projection(projection);

  const tooltip = d3.select('.tooltip');

  const zoom = d3.zoom()
    .scaleExtent([1, 12])
    .on('zoom', zoomed);

  const svg = d3.select('body').append('svg')
    .attr('width', width)
    .attr('height', height)
    .call(zoom);

  svg.append('g');

  Promise.all([
    d3.json('https://gist.githubusercontent.com/igaponov/be196eb8ff3a56847fb75dfc23550c75/raw/1e6f6b2dca4f612ffed941a02faee37a8837b0e2/countries.json'),
    d3.json('https://gist.githubusercontent.com/igaponov/be196eb8ff3a56847fb75dfc23550c75/raw/1e6f6b2dca4f612ffed941a02faee37a8837b0e2/world-110m.json'),
    d3.json('https://gist.githubusercontent.com/igaponov/be196eb8ff3a56847fb75dfc23550c75/raw/1e6f6b2dca4f612ffed941a02faee37a8837b0e2/data.json'),
  ]).then(onFulfilled, onRejected);

  function onFulfilled([countries, world, data]) {
    countries = countries.filter(country => data.hasOwnProperty(country.alpha2.toUpperCase()));
    populateSelect(countries);

    const topoData = topojson.feature(world, world.objects.countries).features;

    const countryData = countries.reduce(
      (result, country) => {
        result[country.id] = {
          name: country.name,
          code: country.alpha2.toUpperCase(),
        };
        return result;
      },
      {}
    );

    svg.select('g')
      .selectAll("path")
      .data(topoData.filter(function(d) {
        const country = countryData[d.id];
        if (country && data[country.code]) {
          d.name = country.name;
          d.code = country.code;
          return true;
        }
      }))
      .enter()
      .append("path")
      .attr("stroke", "white")
      .attr("stroke-width", 1)
      .attr("fill", 'gray')
      .attr("d", path )
      .on("mouseover", function() {
        d3.select(this).attr("fill-opacity", 0.4);
      })
      .on("mousemove", function(d) {
        tooltip.classed("hidden", false)
          .style("top", (d3.event.pageY) + "px")
          .style("left", (d3.event.pageX + 10) + "px")
          .html(d.name + (d.hasOwnProperty('visa') ? ': ' + d.visa : ''));
      })
      .on("mouseout", function() {
        d3.select(this).attr("fill-opacity", 1);
        tooltip.classed("hidden", true);
      });

    document
      .addEventListener('autocomplete', function (event) {
        svg.select('g')
          .selectAll('path')
          .each(function(d) {
            if (d.code === event.detail) {
              d3.select(this).attr('fill', 'gray');
            } else {
              const parsed = parse(d.code, event.detail, data);
              d3.select(this).attr('fill', colors[parsed[0]]);
              d.visa = [parsed[1], parsed[2]].filter(a => !!a).join(' / ');
            }
          });
      });
  }

  function onRejected(err) {
    document.write(err.message);
  }

  function zoomed() {
    svg.select('g')
      .selectAll('path')
      .attr("stroke-width", 1 / d3.event.transform.k)
      .attr('transform', d3.event.transform);
  }

  function parse(code, currentCode, data) {
    let kind, type, term;
    const index = data[currentCode].indexOf(code);
    if (index === -1) {
      [kind, type, term] = [4,0,0];
    } else {
      [kind, type, term] = data[currentCode].substr(index + 2, 3).split('').map(n => parseInt(n, 32));
    }
    return [
      kinds[kind],
      type ? types[type] : fullKinds[kind],
      terms[term],
    ];
  }

  function populateSelect(countries) {
    new autoComplete({
      selector: '#country',
      minChars: 1,
      offsetTop: 5,
      source: function(term, suggest) {
        term = term.toLowerCase();
        suggest(countries.filter(country => country.name.toLowerCase().indexOf(term) !== -1));
      },
      renderItem: function (item, search) {
        search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        return '<div class="autocomplete-suggestion" data-val="' + item.name + '" data-code="' + item.alpha2.toUpperCase() + '">' + item.name.replace(`/${search}/gi`, "<b>$1</b>") + '</div>';
      },
      onSelect: function(e, term, item) {
        document.dispatchEvent(new CustomEvent('autocomplete', { detail: item.getAttribute('data-code') }));
      }
    });
  }
})();
