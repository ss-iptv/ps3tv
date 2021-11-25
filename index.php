
<!DOCTYPE html>

<html dir="ltr" lang="pt">

<head>
<meta charset="utf-8">
<meta name="google" value="notranslate">

<script>
function addRow(name, url, isdir,
    size, size_string, date_modified, date_modified_string) {
  if (name == "." || name == "..")
    return;

  var root = document.location.pathname;
  if (root.substr(-1) !== "/")
    root += "/";

  var tbody = document.getElementById("tbody");
  var row = document.createElement("tr");
  var file_cell = document.createElement("td");
  var link = document.createElement("a");

  link.className = isdir ? "icon dir" : "icon file";

  if (isdir) {
    name = name + "/";
    url = url + "/";
    size = 0;
    size_string = "";
  } else {
    link.draggable = "true";
    link.addEventListener("dragstart", onDragStart, false);
  }
  link.innerText = name;
  link.href = root + url;

  file_cell.dataset.value = name;
  file_cell.appendChild(link);

  row.appendChild(file_cell);
  row.appendChild(createCell(size, size_string));
  row.appendChild(createCell(date_modified, date_modified_string));

  tbody.appendChild(row);
}

function onDragStart(e) {
  var el = e.srcElement;
  var name = el.innerText.replace(":", "");
  var download_url_data = "application/octet-stream:" + name + ":" + el.href;
  e.dataTransfer.setData("DownloadURL", download_url_data);
  e.dataTransfer.effectAllowed = "copy";
}

function createCell(value, text) {
  var cell = document.createElement("td");
  cell.setAttribute("class", "detailsColumn");
  cell.dataset.value = value;
  cell.innerText = text;
  return cell;
}

function start(location) {
  var header = document.getElementById("header");
  header.innerText = header.innerText.replace("LOCATION", location);

  document.getElementById("title").innerText = header.innerText;
}

function onHasParentDirectory() {
  var box = document.getElementById("parentDirLinkBox");
  box.style.display = "block";

  var root = document.location.pathname;
  if (!root.endsWith("/"))
    root += "/";

  var link = document.getElementById("parentDirLink");
  link.href = root + "..";
}

function onListingParsingError() {
  var box = document.getElementById("listingParsingErrorBox");
  box.innerHTML = box.innerHTML.replace("LOCATION", encodeURI(document.location)
      + "?raw");
  box.style.display = "block";
}

function sortTable(column) {
  var theader = document.getElementById("theader");
  var oldOrder = theader.cells[column].dataset.order || '1';
  oldOrder = parseInt(oldOrder, 10)
  var newOrder = 0 - oldOrder;
  theader.cells[column].dataset.order = newOrder;

  var tbody = document.getElementById("tbody");
  var rows = tbody.rows;
  var list = [], i;
  for (i = 0; i < rows.length; i++) {
    list.push(rows[i]);
  }

  list.sort(function(row1, row2) {
    var a = row1.cells[column].dataset.value;
    var b = row2.cells[column].dataset.value;
    if (column) {
      a = parseInt(a, 10);
      b = parseInt(b, 10);
      return a > b ? newOrder : a < b ? oldOrder : 0;
    }

    // Column 0 is text.
    if (a > b)
      return newOrder;
    if (a < b)
      return oldOrder;
    return 0;
  });

  // Appending an existing child again just moves it.
  for (i = 0; i < list.length; i++) {
    tbody.appendChild(list[i]);
  }
}

// Add event handlers to column headers.
function addHandlers(element, column) {
  element.onclick = (e) => sortTable(column);
  element.onkeydown = (e) => {
    if (e.key == 'Enter' || e.key == ' ') {
      sortTable(column);
      e.preventDefault();
    }
  };
}

function onLoad() {
  addHandlers(document.getElementById('nameColumnHeader'), 0);
  addHandlers(document.getElementById('sizeColumnHeader'), 1);
  addHandlers(document.getElementById('dateColumnHeader'), 2);
}

window.addEventListener('DOMContentLoaded', onLoad);
</script>

<style>

  h1 {
    border-bottom: 1px solid #c0c0c0;
    margin-bottom: 10px;
    padding-bottom: 10px;
    white-space: nowrap;
  }

  table {
    border-collapse: collapse;
  }

  th {
    cursor: pointer;
  }

  td.detailsColumn {
    padding-inline-start: 2em;
    text-align: end;
    white-space: nowrap;
  }

  a.icon {
    padding-inline-start: 1.5em;
    text-decoration: none;
    user-select: auto;
  }

  a.icon:hover {
    text-decoration: underline;
  }

  a.file {
    background : url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAABnRSTlMAAAAAAABupgeRAAABHUlEQVR42o2RMW7DIBiF3498iHRJD5JKHurL+CRVBp+i2T16tTynF2gO0KSb5ZrBBl4HHDBuK/WXACH4eO9/CAAAbdvijzLGNE1TVZXfZuHg6XCAQESAZXbOKaXO57eiKG6ft9PrKQIkCQqFoIiQFBGlFIB5nvM8t9aOX2Nd18oDzjnPgCDpn/BH4zh2XZdlWVmWiUK4IgCBoFMUz9eP6zRN75cLgEQhcmTQIbl72O0f9865qLAAsURAAgKBJKEtgLXWvyjLuFsThCSstb8rBCaAQhDYWgIZ7myM+TUBjDHrHlZcbMYYk34cN0YSLcgS+wL0fe9TXDMbY33fR2AYBvyQ8L0Gk8MwREBrTfKe4TpTzwhArXWi8HI84h/1DfwI5mhxJamFAAAAAElFTkSuQmCC ") left top no-repeat;
  }

  a.dir {
    background : url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAd5JREFUeNqMU79rFUEQ/vbuodFEEkzAImBpkUabFP4ldpaJhZXYm/RiZWsv/hkWFglBUyTIgyAIIfgIRjHv3r39MePM7N3LcbxAFvZ2b2bn22/mm3XMjF+HL3YW7q28YSIw8mBKoBihhhgCsoORot9d3/ywg3YowMXwNde/PzGnk2vn6PitrT+/PGeNaecg4+qNY3D43vy16A5wDDd4Aqg/ngmrjl/GoN0U5V1QquHQG3q+TPDVhVwyBffcmQGJmSVfyZk7R3SngI4JKfwDJ2+05zIg8gbiereTZRHhJ5KCMOwDFLjhoBTn2g0ghagfKeIYJDPFyibJVBtTREwq60SpYvh5++PpwatHsxSm9QRLSQpEVSd7/TYJUb49TX7gztpjjEffnoVw66+Ytovs14Yp7HaKmUXeX9rKUoMoLNW3srqI5fWn8JejrVkK0QcrkFLOgS39yoKUQe292WJ1guUHG8K2o8K00oO1BTvXoW4yasclUTgZYJY9aFNfAThX5CZRmczAV52oAPoupHhWRIUUAOoyUIlYVaAa/VbLbyiZUiyFbjQFNwiZQSGl4IDy9sO5Wrty0QLKhdZPxmgGcDo8ejn+c/6eiK9poz15Kw7Dr/vN/z6W7q++091/AQYA5mZ8GYJ9K0AAAAAASUVORK5CYII= ") left top no-repeat;
  }

  a.up {
    background : url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAmlJREFUeNpsU0toU0EUPfPysx/tTxuDH9SCWhUDooIbd7oRUUTMouqi2iIoCO6lceHWhegy4EJFinWjrlQUpVm0IIoFpVDEIthm0dpikpf3ZuZ6Z94nrXhhMjM3c8895977BBHB2PznK8WPtDgyWH5q77cPH8PpdXuhpQT4ifR9u5sfJb1bmw6VivahATDrxcRZ2njfoaMv+2j7mLDn93MPiNRMvGbL18L9IpF8h9/TN+EYkMffSiOXJ5+hkD+PdqcLpICWHOHc2CC+LEyA/K+cKQMnlQHJX8wqYG3MAJy88Wa4OLDvEqAEOpJd0LxHIMdHBziowSwVlF8D6QaicK01krw/JynwcKoEwZczewroTvZirlKJs5CqQ5CG8pb57FnJUA0LYCXMX5fibd+p8LWDDemcPZbzQyjvH+Ki1TlIciElA7ghwLKV4kRZstt2sANWRjYTAGzuP2hXZFpJ/GsxgGJ0ox1aoFWsDXyyxqCs26+ydmagFN/rRjymJ1898bzGzmQE0HCZpmk5A0RFIv8Pn0WYPsiu6t/Rsj6PauVTwffTSzGAGZhUG2F06hEc9ibS7OPMNp6ErYFlKavo7MkhmTqCxZ/jwzGA9Hx82H2BZSw1NTN9Gx8ycHkajU/7M+jInsDC7DiaEmo1bNl1AMr9ASFgqVu9MCTIzoGUimXVAnnaN0PdBBDCCYbEtMk6wkpQwIG0sn0PQIUF4GsTwLSIFKNqF6DVrQq+IWVrQDxAYQC/1SsYOI4pOxKZrfifiUSbDUisif7XlpGIPufXd/uvdvZm760M0no1FZcnrzUdjw7au3vu/BVgAFLXeuTxhTXVAAAAAElFTkSuQmCC ") left top no-repeat;
  }

  html[dir=rtl] a {
    background-position-x: right;
  }

  #parentDirLinkBox {
    margin-bottom: 10px;
    padding-bottom: 10px;
  }

  #listingParsingErrorBox {
    border: 1px solid black;
    background: #fae691;
    padding: 10px;
    display: none;
  }
</style>

<title id="title"></title>

</head>

<body>

<div id="listingParsingErrorBox">O servidor enviou dados que o Microsoft Edge não entendeu. Você pode <a href="https://permanently-removed.invalid">relatar um bug</a> e incluir a <a href="LOCATION">listagem bruta</a>.</div>

<h1 id="header">Índice de LOCATION</h1>

<div id="parentDirLinkBox" style="display:none">
  <a id="parentDirLink" class="icon up">
    <span id="parentDirText">[diretório pai]</span>
  </a>
</div>

<table>
  <thead>
    <tr class="header" id="theader">
      <th id="nameColumnHeader" tabindex=0 role="button">Nome</th>
      <th id="sizeColumnHeader" class="detailsColumn" tabindex=0 role="button">
        Tamanho
      </th>
      <th id="dateColumnHeader" class="detailsColumn" tabindex=0 role="button">
        Data da modificação
      </th>
    </tr>
  </thead>
  <tbody id="tbody">
  </tbody>
</table>

</body>

</html>
<script>// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview This file defines a singleton which provides access to all data
 * that is available as soon as the page's resources are loaded (before DOM
 * content has finished loading). This data includes both localized strings and
 * any data that is important to have ready from a very early stage (e.g. things
 * that must be displayed right away).
 *
 * Note that loadTimeData is not guaranteed to be consistent between page
 * refreshes (https://crbug.com/740629) and should not contain values that might
 * change if the page is re-opened later.
 */

/** @type {!LoadTimeData} */
// eslint-disable-next-line no-var
var loadTimeData;

class LoadTimeData {
  constructor() {
    /** @type {?Object} */
    this.data_ = null;
  }

  /**
   * Sets the backing object.
   *
   * Note that there is no getter for |data_| to discourage abuse of the form:
   *
   *     var value = loadTimeData.data()['key'];
   *
   * @param {Object} value The de-serialized page data.
   */
  set data(value) {
    expect(!this.data_, 'Re-setting data.');
    this.data_ = value;
  }

  /**
   * @param {string} id An ID of a value that might exist.
   * @return {boolean} True if |id| is a key in the dictionary.
   */
  valueExists(id) {
    return id in this.data_;
  }

  /**
   * Fetches a value, expecting that it exists.
   * @param {string} id The key that identifies the desired value.
   * @return {*} The corresponding value.
   */
  getValue(id) {
    expect(this.data_, 'No data. Did you remember to include strings.js?');
    const value = this.data_[id];
    expect(typeof value !== 'undefined', 'Could not find value for ' + id);
    return value;
  }

  /**
   * As above, but also makes sure that the value is a string.
   * @param {string} id The key that identifies the desired string.
   * @return {string} The corresponding string value.
   */
  getString(id) {
    const value = this.getValue(id);
    expectIsType(id, value, 'string');
    return /** @type {string} */ (value);
  }

  /**
   * Returns a formatted localized string where $1 to $9 are replaced by the
   * second to the tenth argument.
   * @param {string} id The ID of the string we want.
   * @param {...(string|number)} var_args The extra values to include in the
   *     formatted output.
   * @return {string} The formatted string.
   */
  getStringF(id, var_args) {
    const value = this.getString(id);
    if (!value) {
      return '';
    }

    const args = Array.prototype.slice.call(arguments);
    args[0] = value;
    return this.substituteString.apply(this, args);
  }

  /**
   * Returns a formatted localized string where $1 to $9 are replaced by the
   * second to the tenth argument. Any standalone $ signs must be escaped as
   * $$.
   * @param {string} label The label to substitute through.
   *     This is not an resource ID.
   * @param {...(string|number)} var_args The extra values to include in the
   *     formatted output.
   * @return {string} The formatted string.
   */
  substituteString(label, var_args) {
    const varArgs = arguments;
    return label.replace(/\$(.|$|\n)/g, function(m) {
      expect(m.match(/\$[$1-9]/), 'Unescaped $ found in localized string.');
      return m === '$$' ? '$' : varArgs[m[1]];
    });
  }

  /**
   * Returns a formatted string where $1 to $9 are replaced by the second to
   * tenth argument, split apart into a list of pieces describing how the
   * substitution was performed. Any standalone $ signs must be escaped as $$.
   * @param {string} label A localized string to substitute through.
   *     This is not an resource ID.
   * @param {...(string|number)} var_args The extra values to include in the
   *     formatted output.
   * @return {!Array<!{value: string, arg: (null|string)}>} The formatted
   *     string pieces.
   */
  getSubstitutedStringPieces(label, var_args) {
    const varArgs = arguments;
    // Split the string by separately matching all occurrences of $1-9 and of
    // non $1-9 pieces.
    const pieces = (label.match(/(\$[1-9])|(([^$]|\$([^1-9]|$))+)/g) ||
                    []).map(function(p) {
      // Pieces that are not $1-9 should be returned after replacing $$
      // with $.
      if (!p.match(/^\$[1-9]$/)) {
        expect(
            (p.match(/\$/g) || []).length % 2 === 0,
            'Unescaped $ found in localized string.');
        return {value: p.replace(/\$\$/g, '$'), arg: null};
      }

      // Otherwise, return the substitution value.
      return {value: varArgs[p[1]], arg: p};
    });

    return pieces;
  }

  /**
   * As above, but also makes sure that the value is a boolean.
   * @param {string} id The key that identifies the desired boolean.
   * @return {boolean} The corresponding boolean value.
   */
  getBoolean(id) {
    const value = this.getValue(id);
    expectIsType(id, value, 'boolean');
    return /** @type {boolean} */ (value);
  }

  /**
   * As above, but also makes sure that the value is an integer.
   * @param {string} id The key that identifies the desired number.
   * @return {number} The corresponding number value.
   */
  getInteger(id) {
    const value = this.getValue(id);
    expectIsType(id, value, 'number');
    expect(value === Math.floor(value), 'Number isn\'t integer: ' + value);
    return /** @type {number} */ (value);
  }

  /**
   * Override values in loadTimeData with the values found in |replacements|.
   * @param {Object} replacements The dictionary object of keys to replace.
   */
  overrideValues(replacements) {
    expect(
        typeof replacements === 'object',
        'Replacements must be a dictionary object.');
    for (const key in replacements) {
      this.data_[key] = replacements[key];
    }
  }

  /**
   * Reset loadTimeData's data. Should only be used in tests.
   * @param {?Object} newData The data to restore to, when null restores to
   *    unset state.
   */
  resetForTesting(newData = null) {
    this.data_ = newData;
  }

  /**
   * @return {boolean} Whether loadTimeData.data has been set.
   */
  isInitialized() {
    return this.data_ !== null;
  }
}

  /**
   * Checks condition, throws error message if expectation fails.
   * @param {*} condition The condition to check for truthiness.
   * @param {string} message The message to display if the check fails.
   */
  function expect(condition, message) {
    if (!condition) {
      throw new Error(
          'Unexpected condition on ' + document.location.href + ': ' + message);
    }
  }

  /**
   * Checks that the given value has the given type.
   * @param {string} id The id of the value (only used for error message).
   * @param {*} value The value to check the type on.
   * @param {string} type The type we expect |value| to be.
   */
  function expectIsType(id, value, type) {
    expect(
        typeof value === type, '[' + value + '] (' + id + ') is not a ' + type);
  }

  expect(!loadTimeData, 'should only include this file once');
  loadTimeData = new LoadTimeData;

  // Expose |loadTimeData| directly on |window|, since within a JS module the
  // scope is local and not all files have been updated to import the exported
  // |loadTimeData| explicitly.
  window.loadTimeData = loadTimeData;

  console.warn('crbug/1173575, non-JS module files deprecated.');</script><script>loadTimeData.data = {"header":"Índice de LOCATION","headerDateModified":"Data da modificação","headerName":"Nome","headerSize":"Tamanho","language":"pt","listingParsingErrorBoxText":"O servidor enviou dados que o Microsoft Edge não entendeu. Você pode \u003Ca href=\"https://permanently-removed.invalid\">relatar um bug\u003C/a> e incluir a \u003Ca href=\"LOCATION\">listagem bruta\u003C/a>.","parentDirText":"[diretório pai]","textdirection":"ltr"};</script><script>start("C:\\Users\\HP\\Documents\\GitHub\\aulas\\m3u\\listas\\");</script>
<script>onHasParentDirectory();</script>
<script>addRow("all_channels.m3u","all_channels.m3u",0,13513851,"12.9 MB",1637810254,"25/11/2021 00:17:34");</script>
<script>addRow("all_series.m3u","all_series.m3u",0,10058762,"9.6 MB",1637806214,"24/11/2021 23:10:14");</script>
<script>addRow("amazon-apple-disney-tnt.m3u","amazon-apple-disney-tnt.m3u",0,1881565,"1.8 MB",1637805758,"24/11/2021 23:02:38");</script>
<script>addRow("amazon.m3u","amazon.m3u",0,1385286,"1.3 MB",1637805836,"24/11/2021 23:03:56");</script>
<script>addRow("apple-tnt.m3u","apple-tnt.m3u",0,89271,"87.2 kB",1637861054,"25/11/2021 14:24:14");</script>
<script>addRow("desenhoseanimes.m3u","desenhoseanimes.m3u",0,2091673,"2.0 MB",1637814168,"25/11/2021 01:22:48");</script>
<script>addRow("disney.m3u","disney.m3u",0,406765,"397 kB",1637805354,"24/11/2021 22:55:54");</script>
<script>addRow("filmes_torrent.m3u","filmes_torrent.m3u",0,1810342,"1.7 MB",1637820275,"25/11/2021 03:04:35");</script>
<script>addRow("filmes.m3u","filmes.m3u",0,742404,"725 kB",1637814047,"25/11/2021 01:20:47");</script>
<script>addRow("filmesNovo.m3u","filmesNovo.m3u",0,906709,"885 kB",1637593518,"22/11/2021 12:05:18");</script>
<script>addRow("hbo-max-fox.m3u","hbo-max-fox.m3u",0,435291,"425 kB",1637805571,"24/11/2021 22:59:31");</script>
<script>addRow("iptv-24.m3u","iptv-24.m3u",0,146979,"144 kB",1637805520,"24/11/2021 22:58:40");</script>
<script>addRow("iptv-link.m3u","iptv-link.m3u",0,229858,"224 kB",1637819540,"25/11/2021 02:52:20");</script>
<script>addRow("netflix.m3u","netflix.m3u",0,2032898,"1.9 MB",1637805173,"24/11/2021 22:52:53");</script>
<script>addRow("novelas.m3u","novelas.m3u",0,3809802,"3.6 MB",1637594105,"22/11/2021 12:15:05");</script>
<script>addRow("nulliptv-canais.m3u","nulliptv-canais.m3u",0,122029,"119 kB",1637819268,"25/11/2021 02:47:48");</script>
<script>addRow("nulliptv.m3u","nulliptv.m3u",0,712569,"696 kB",1637818918,"25/11/2021 02:41:58");</script>
<script>addRow("nullseries.m3u","nullseries.m3u",0,535546,"523 kB",1637819322,"25/11/2021 02:48:42");</script>
<script>addRow("plutotv-world.m3u","plutotv-world.m3u",0,612143,"598 kB",1637800009,"24/11/2021 21:26:49");</script>
<script>addRow("plutotv.m3u","plutotv.m3u",0,63773,"62.3 kB",1637800146,"24/11/2021 21:29:06");</script>
<script>addRow("series-a-z.m3u","series-a-z.m3u",0,6658427,"6.3 MB",1637812431,"25/11/2021 00:53:51");</script>
<script>addRow("starz-globo-telecine.m3u","starz-globo-telecine.m3u",0,1595771,"1.5 MB",1637805153,"24/11/2021 22:52:33");</script>
<script>addRow("starz.m3u","starz.m3u",0,543933,"531 kB",1637804450,"24/11/2021 22:40:50");</script>
<script>addRow("streaming2.m3u","streaming2.m3u",0,6474183,"6.2 MB",1637595028,"22/11/2021 12:30:28");</script>
