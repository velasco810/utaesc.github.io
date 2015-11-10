---
layout: page
title: Executive Officers
nav: Executive Officers
order: 2
permalink: /officers/
---

# Executive Officers

Listed below are the executive officers for the 2015-2016 term.

----

{% assign officers = site.officers | sort: 'order' %}
{% for officer in officers %}
  <section>
  {% if officer.image %}
  <figure class="tile">
    <img class="round" src="{{ officer.image }}" alt="{{ officer.name }}" title="{{ officer.title }} - {{ officer.name }}"/>
  </figure>
  {% endif %}
    <h2>{{ officer.title }}</h2>
    <p>
      <strong>{{ officer.name }}</strong>
    </p>
    {{ officer.content }}
  </section>
{% endfor %}
