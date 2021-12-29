/*
 *  Online TV plugin for Movian Media Center
 *
 *  Copyright (C) 2015-2018 lprot
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var page = require('showtime/page');
var service = require('showtime/service');
var settings = require('showtime/settings');
var http = require('showtime/http');
var string = require('native/string');
var popup = require('native/popup');
var io = require('native/io');
var plugin = JSON.parse(Plugin.manifest);
var logo = Plugin.path + plugin.icon;

RichText = function(x) {
    this.str = x.toString();
}

RichText.prototype.toRichString = function(x) {
    return this.str;
}

var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36';
								 
															
 

function setPageHeader(page, title) {
						
    if (page.metadata) {
        page.metadata.title = new RichText(decodeURIComponent(title));
        page.metadata.logo = logo;
    }
	page.model.contents = 'grid';
    page.type = "directory";
    page.contents = "items";
    page.loading = false;
}

var blue = '6699CC', orange = 'FFA500', red = 'EE0000', green = '008B45';
function coloredStr(str, color) {
    return '<font color="' + color + '">' + str + '</font>';
}

function trim(s) {
    if (s) return s.replace(/(\r\n|\n|\r)/gm, "").replace(/(^\s*)|(\s*$)/gi, "").replace(/[ ]{2,}/gi, " ").replace(/\t/g, '');
    return '';
}

service.create(plugin.title, plugin.id + ":start", 'PlayStation®TV', true, logo);

settings.globalSettings(plugin.id, plugin.title, logo, plugin.synopsis);
settings.createBool('disableSampleList', "Don't show Sample M3U list", false, function(v) {
    service.disableSampleList = v;
});
settings.createBool('disableSampleXMLList', "Don't show Sample XML list", false, function(v) {
    service.disableSampleXMLList = v;
});
settings.createBool('disableProvidersList', "Don't show Provider list", true, function(v) {
    service.disableProviderList = v;
});
settings.createBool('disableEPG', "Don't fetch EPG", true, function(v) {
    service.disableEPG = v;
});
settings.createString('acestreamIp', "IP address of AceStream Proxy. Enter IP only.", '192.168.0.93', function(v) {
    service.acestreamIp = v;
});
settings.createBool('debug', 'Enable debug logging', false, function(v) {
    service.debug = v;
});
settings.createBool('disableMyFavorites', "Don't show My Favorites", true, function(v) {
    service.disableMyFavorites = v;
});
settings.createAction("cleanFavorites", "Clean My Favorites", function () {
    store.list = "[]";
    popup.notify('Favorites has been cleaned successfully', 2);
});

var store = require('movian/store').create('favorites');
if (!store.list) 
    store.list = "[]";

var playlists = require('movian/store').create('playlists');
if (!playlists.list)
    playlists.list = "[]";

function addOptionForAddingToMyFavorites(item, link, title, icon) {
    item.addOptAction("Add '" + title + "' to My Favorites", function() {
        var entry = JSON.stringify({
            link: encodeURIComponent(link),
            title: encodeURIComponent(title),
            icon: encodeURIComponent(icon)
        });
        store.list = JSON.stringify([entry].concat(eval(store.list)));
        popup.notify("'" + title + "' has been added to My Favorites.", 2);
    });
}

function addOptionForRemovingFromMyFavorites(page, item, title, pos) {
    item.addOptAction("Borrar '" + title + "' de Mis Favoritos", function() {
        var list = eval(store.list);
        popup.notify("'" + title + "' Borrado de mis Favoritos.", 2);
        list.splice(pos, 1);
        store.list = JSON.stringify(list);
        page.redirect(plugin.id + ':favorites');
    });
}

var API = 'https://www.googleapis.com/youtube/v3',
    key = "AIzaSyCSDI9_w8ROa1UoE2CNIUdDQnUhNbp9XR4"

new page.Route(plugin.id + ":youtube:(.*)", function(page, title) {
    page.loading = true;
    try {
        var doc = http.request(API + '/search', {
            args: {
                part: 'snippet',
                type: 'video',
                q: unescape(title),
                maxResults: 1,
                eventType: 'live',
                key: key
            }
        }).toString();
        page.redirect('youtube:video:' + JSON.parse(doc).items[0].id.videoId);
    } catch (err) {
        page.metadata.title = unescape(title);
        page.error("Sorry, can't get the channel's link :(");
    }
    page.loading = false;
});

new page.Route(plugin.id + ":tivix:(.*):(.*):(.*)", function(page, url, title, icon) {
    setPageHeader(page, unescape(title));
    page.loading = true;
    var resp = http.request(unescape(url)).toString();
    var re = /file=([\S\s]*?)&/g;
    var match = re.exec(resp);
    if (!match) {
        re = /skin" src="([\S\s]*?)"/g;
        match = re.exec(resp);
    }
    if (!match) {
        re = /<span id="srces" style="display:none">([\S\s]*?)</g;
        match = re.exec(resp);
    }

    while (match) {
        io.httpInspectorCreate('.*' + match[1].replace('http://', '').replace('https://', '').split(/[/?#]/)[0].replace(/\./g, '\\.') + '.*', function(req) {
            req.setHeader('Referer', unescape(url));
            req.setHeader('User-Agent', UA);
        });
        log('Probing: ' + match[1]);
        if (!match[1].match(/m3u8/) && io.probe(match[1]).result) {
            match = re.exec(resp);
            continue;
        }
        var link = unescape(match[1]);
        if (link.match(/rtmp/))
            link += ' swfUrl=http://tivix.co' + (resp.match(/data="(.*)"/) ? resp.match(/data="(.*)"/)[1] : '') + ' pageUrl=' + unescape(url);
        log('Playing url: ' + url);
        playUrl(page, link, plugin.id + ':tivix:' + url + ':' + title, unescape(title), 0, icon);
        return;
    }

    // try to get youtube link
    match = resp.match(/\.com\/v\/([\S\s]*?)(\?|=)/);
    if (match) {
        page.redirect('youtube:video:' + match[1]);
        return;
    }
    if (resp.match('Канал удалён по требованию правообладателя'))
        page.error('Канал удалён по требованию правообладателя =(');
    else
        page.error("Sorry, can't get the link :(");
    page.loading = false;
});

new page.Route(plugin.id + ":acestream:(.*):(.*)", function(page, id, title) {
    playUrl(page, 'http://' + service.acestreamIp + ':6878/ace/manifest.m3u8?id=' + id.replace('//', ''), plugin.id + ':acestream:' + id + ':' + title, unescape(title));
});

function playUrl(page, url, canonicalUrl, title, mimetype, icon, subsscan, imdbid) {
    if (url) {
        log('playUrl: ' + url);
        if (url.substr(0, 2) == '//') 
            url = 'http:' + url;
        page.type = "video";
        page.source = "videoparams:" + JSON.stringify({
            title: title,
            imdbid: imdbid ? imdbid : void(0),
            canonicalUrl: canonicalUrl,
            icon: icon ? unescape(icon) : void(0),
            sources: [{
                url: url.match(/m3u8/) ? 'hls:' + url : url,
                mimetype: mimetype ? mimetype : void(0)
            }],
            no_subtitle_scan: subsscan ? false : true,
            no_fs_scan: subsscan ? false : true
        });
    } else 
        page.error("Sorry, can't get the link :(");
    page.loading = false;
}

new page.Route(plugin.id + ":hls:(.*):(.*)", function(page, url, title) {
    page.loading = true;
    page.metadata.title = unescape(title);
    playUrl(page, 'http://' + unescape(url), plugin.id + ':hls:' + url + ':' + title, unescape(title)); 
});

new page.Route(plugin.id + ":m3u8:(.*):(.*)", function(page, url, title) {
    page.loading = true;
    page.metadata.title = unescape(title);
    var resp = http.request('http://' + unescape(url)).toString();
    var match = resp.match(/[^ "|\'|>]+m3u8[^ "|\'|<]*/g);
    for (var i in match) {
        var elem = match[i].replace(/\\\//g, '/').replace(/^\/\//g, 'http://');
        if (elem.match(/^http/)) {
            match = elem;
            break;
        }
    }

    io.httpInspectorCreate('.*' + match.replace('http://', '').replace('https://', '').split(/[/?#]/)[0].replace(/\./g, '\\.') + '.*', function(req) {
        req.setHeader('Referer', 'http://' + unescape(url));
        req.setHeader('User-Agent', UA);
    });

    playUrl(page, match, plugin.id + ':m3u8:' + url + ':' + title, unescape(title)); 
});

new page.Route(plugin.id + ":gledai:(.*):(.*):(.*)", function(page, channel, route, title) {
    page.loading = true;
    page.metadata.title = unescape(title);
    r = 'http://www.bg-gledai.me/new/geto2.php?my=' + unescape(channel);

    var resp = http.request(r, {
	headers: {
	    Host: 'www.bg-gledai.me',
	    Referer: 'http://' + unescape(route),
	    'User-Agent': UA
	}
    }).toString();
    var s = unescape(unescape(resp).match(/unescape\(\'(.*?)\'/)[1]);
    resp = http.request(s, {
	headers: {
	    Host: 'www.bg-gledai.me',
	    Referer: r,
	    'User-Agent': UA
	}
    }).toString();
    match = resp.match(/file>(.*?)</)[1].replace(/&amp;/g, '&');
    io.httpInspectorCreate('.*gledai.*', function(req) {
        req.setHeader('Origin', 'http://bg.gledai.me');
        req.setHeader('Referer', r);
        req.setHeader('User-Agent', UA);
    });
    playUrl(page, match, plugin.id + ':gledai:' + channel + ':' + route + ':' + title, unescape(title)); 
});

new page.Route(plugin.id + ":ovva:(.*):(.*)", function(page, url, title) {
    page.loading = true;
    page.metadata.title = unescape(title);
    var match = http.request('https://' + unescape(url)).toString();
    if (match.match(/data-timer="([\s\S]*?)"/)) {
        page.error('Трансляция будет доступна: ' + new Date(match.match(/data-timer="([\s\S]*?)"/)[1] * 1000));
        return;
    }
    var json = match.match(/ovva-player","([\s\S]*?)"/);
    if (json)
        json = JSON.parse(Duktape.dec('base64', json[1]));
    match = 0;    
    if (json) {
        json = http.request(json.balancer).toString();
        log(json);
        match = json.match(/=([\s\S]*?$)/);
        if (match) match = match[1];
    }
    playUrl(page, match, plugin.id + ':ovva:' + url + ':' + title, unescape(title));
});

new page.Route(plugin.id + ":dailymotion:(.*):(.*)", function(page, url, title) {
    page.loading = true;
    page.metadata.title = unescape(title);
    var resp = http.request('http://www.dailymotion.com/embed/video/' + url).toString();
    var match = resp.match(/stream_chromecast_url":"([\S\s]*?)"/);
    if (match) match = match[1].replace(/\\\//g, '/');
    playUrl(page, match, plugin.id + ':dailymotion:' + url + ':' + title, unescape(title));
});

new page.Route(plugin.id + ":euronews:(.*):(.*)", function(page, country, title) {
    page.loading = true;
    page.metadata.title = unescape(title);
    if (country == 'en')
        country = 'www';
    var json = JSON.parse(http.request('http://' + country + '.euronews.com/api/watchlive.json'));
    json = JSON.parse(http.request(json.url));
    playUrl(page, json.primary, plugin.id + ':euronews:' + country + ':' + title, unescape(title));
});

new page.Route(plugin.id + ":ts:(.*):(.*)", function(page, url, title) {
    page.metadata.title = unescape(title);
    page.loading = true;
    playUrl(page, unescape(url), plugin.id + ':ts:' + url + ':' + title, unescape(title), 'video/mp2t');
});

function fill_fav(page) {
    var list = eval(store.list);

    if (!list || !list.toString()) {
        page.error("My Favorites list is empty");
        return;
    }
    var pos = 0;
    for (var i in list) {
        var itemmd = JSON.parse(list[i]);
        var item = page.appendItem(decodeURIComponent(itemmd.link), "video", {
            title: decodeURIComponent(itemmd.title),
            icon: itemmd.icon ? decodeURIComponent(itemmd.icon) : null,
            description: new RichText(coloredStr('Link: ', orange) + decodeURIComponent(itemmd.link))
        });
        addOptionForRemovingFromMyFavorites(page, item, decodeURIComponent(itemmd.title), pos);
        pos++;
    }
}

// Favorites
new page.Route(plugin.id + ":favorites", function(page) {
    setPageHeader(page, "My Favorites");
    fill_fav(page);
});

new page.Route(plugin.id + ":indexTivix:(.*):(.*)", function(page, url, title) {
    page.model.contents = 'grid';
    setPageHeader(page, decodeURIComponent(title));
    var url = prefixUrl = 'http://tivix.co' + decodeURIComponent(url);
    var tryToSearch = true,
        fromPage = 1,
        n = 0;

    function loader() {
        if (!tryToSearch) return false;
        page.loading = true;
																					   
        var doc = http.request(url).toString();

        page.loading = false;
        // 1-title, 2-url, 3-icon
        var re = /<div class="all_tv" title="([\S\s]*?)">[\S\s]*?href="([\S\s]*?)"[\S\s]*?<img src="([\S\s]*?)"/g;
        var match = re.exec(doc);
        while (match) {
            var icon = 'http://tivix.co' + match[3];
            var link = plugin.id + ":tivix:" + escape(match[2]) + ':' + escape(match[1]) + ':' + escape(icon);
            var item = page.appendItem(link, "video", {
                title: match[1],
                icon: icon
            });
            addOptionForAddingToMyFavorites(item, link, match[1], icon);
            n++;
            match = re.exec(doc);
																						   
																							   
																															  
																															   
				
							
										  
										 
														  
					
			  
        }
        page.metadata.title = new RichText(decodeURIComponent(title) + ' (' + n + ')');
        var next = doc.match(/">Вперед<\/a>/);
        if (!next)
            return tryToSearch = false;
        fromPage++;
        url = prefixUrl + 'page/' + fromPage;;
        return true;
    }
    loader();
    page.paginator = loader;
    page.loading = false;
});

new page.Route(plugin.id + ":tivixStart", function(page) {
    page.model.contents = 'grid';
    setPageHeader(page, 'Tivix.co');
    page.loading = true;
    var doc = http.request('http://tivix.co').toString();
    page.loading = false;
    var re = /<div class="menuuuuuu"([\S\s]*?)<\/div>/g;
    var menus = re.exec(doc);
    var re2 = /<a href="([\S\s]*?)"[\S\s]*?>([\S\s]*?)<\/a>/g;
    while (menus) {
        var submenus = re2.exec(menus[1]);
        while (submenus) {
            page.appendItem(plugin.id + ":indexTivix:" + encodeURIComponent(submenus[1]) + ':' + encodeURIComponent(submenus[2]), "directory", {
                title: submenus[2]
            });
            submenus = re2.exec(menus[1]);
        }
        menus = re.exec(doc);
    }
});

var devId = 0;
if (!devId)
    devId = "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, function(t) {
        var e = 16 * Math.random() | 0,
            n = "x" == t ? e : 3 & e | 8;
        return n.toString(16)
    });

new page.Route(plugin.id + ":playYoutv:(.*):(.*):(.*)", function(page, url, title, icon) {
    page.loading = true;
    var json = JSON.parse(http.request(unescape(url), {
        headers: {
            'Device-Uuid': devId,
            Host: 'api.youtv.com.ua',
            Origin: 'https://youtv.com.ua',
            Referer: 'https://youtv.com.ua/',
            'User-Agent': UA,
            'X-Requested-With': 'XMLHttpRequest'
        },
        debug: service.debug
    }));

    var link = 'https:' + json.playback_url;

    io.httpInspectorCreate('.*' + link.replace('http://', '').replace('https://', '').split(/[/?#]/)[0].replace(/\./g, '\\.') + '.*', function(req) {
        req.setHeader('Referer', 'https://youtv.com.ua/');
        req.setHeader('X-Requested-With', 'ShockwaveFlash/28.0.0.126');
        req.setHeader('User-Agent', UA);
    });
    playUrl(page, link, plugin.id + ':playYoutv:' + url + ':' + title, unescape(title), 0, icon); 
});

new page.Route(plugin.id + ":youtvStart", function(page) {
    page.model.contents = 'grid';
    setPageHeader(page, 'Youtv.com.ua');
    page.loading = true;
    var doc = http.request('https://youtv.com.ua/api/start', {
        headers: {
            Accept: 'application/vnd.youtv.v3+json',
            'Device-Uuid': devId,
            Host: 'youtv.com.ua',
            Referer: 'https://youtv.com.ua/',
            'User-Agent': UA,
            'X-Requested-With': 'XMLHttpRequest'
        },
        debug: service.debug
    }).toString();
    log(doc);

    var json = JSON.parse(http.request('https://youtv.com.ua/api/playlist', {
        headers: {
            Accept: 'application/vnd.youtv.v3+json',
            'Device-Uuid': devId,
            Host: 'youtv.com.ua',
            Origin: 'https://youtv.com.ua',
            Referer: 'https://youtv.com.ua/',
            'User-Agent': UA,
            'X-Requested-With': 'XMLHttpRequest'
        },
        postdata: {},
        debug: service.debug
    }));

    for (var i in json.data) {
        var genres = '',
            first = 1;
        for (var j in json.data[i].categories) {
            if (first) {
                genres += json.data[i].categories[j].name;
                first--;
            } else
                genres += ', ' + json.data[i].categories[j].name;
        }
        page.appendItem(plugin.id + ':playYoutv:' + escape(json.data[i].sources[0].stream.url) + ':' + escape(json.data[i].name) + ':' + escape(json.data[i].image), 'video', {
            title: new RichText(json.data[i].name),
            genre: genres,
            icon: json.data[i].image
        });
        page.entries++;
    }
    page.metadata.title += ' (' + page.entries + ')';
    page.loading = false;
});

function addOptionToRemovePlaylist(page, item, title, pos) {
    item.addOptAction("Borrar '" + title + "' Lista", function() {
        var playlist = eval(playlists.list);
        popup.notify("'" + title + "' Esta lista fue borrada.", 2);
        playlist.splice(pos, 1);
        playlists.list = JSON.stringify(playlist);
        page.flush();
        page.redirect(plugin.id + ':start');
    });
}

function showPlaylist(page) {
    var playlist = eval(playlists.list);

    if (!playlist || !playlist.toString()) 
        popup.notify('Powered by PS3™ 4K Pro', 5);

    var pos = 0;
    for (var i in playlist) {
        var itemmd = JSON.parse(playlist[i]);
        if (!itemmd.link.match(/m3u:http/) && !itemmd.link.match(/xml:http/))
            itemmd.link = 'm3u:' + itemmd.link;
        var item = page.appendItem(itemmd.link + ':' + itemmd.title, "directory", {
            title: decodeURIComponent(itemmd.title),
            link: decodeURIComponent(itemmd.link)
        });
        addOptionToRemovePlaylist(page, item, decodeURIComponent(itemmd.title), pos);
        pos++;
    }
}

var m3uItems = [],
    groups = [],
    theLastList = '';

new page.Route('m3uGroup:(.*):(.*)', function(page, pl, groupID) {
    setPageHeader(page, decodeURIComponent(groupID));
    if (theLastList != pl)
        readAndParseM3U(page, pl);

    var num = 0;
    for (var i in m3uItems) {
        if (decodeURIComponent(groupID) != m3uItems[i].group)
            continue;
        addItem(page, m3uItems[i].url, m3uItems[i].title, m3uItems[i].logo, '', '', '', m3uItems[i].headers);
        num++;
    }
    page.metadata.title = decodeURIComponent(groupID) + ' (' + num + ')';
    page.loading = false;
});

function readAndParseM3U(page, pl, m3u) {
    var title = page.metadata.title + '';
    page.loading = true;
    if (!m3u) {
        page.metadata.title = 'PlayStation®TV...';
        log('Fetching: ' + decodeURIComponent(pl));
        m3u = http.request(decodeURIComponent(pl), {
            headers: {
                'User-Agent': UA
            }
        }).toString().split('\n');
    };
    theLastList = pl;
    m3uItems = [], groups = [];
    var m3uUrl = '',
        m3uTitle = '',
        m3uImage = '',
        m3uGroup = '';
    var line = '',
        m3uRegion = '',
        m3uEpgId = '',
        m3uHeaders = '';
    for (var i = 0; i < m3u.length; i++) {
        page.metadata.title = 'Parsing M3U list. Line ' + i + ' of ' + m3u.length;
        line = m3u[i].trim();
        if (line.substr(0, 7) != '#EXTM3U' && line.indexOf(':') < 0 && line.length != 40) continue; // skip invalid lines
        line = string.entityDecode(line.replace(/[\u200B-\u200F\u202A-\u202E]/g, ''));
        switch (line.substr(0, 7)) {
            case '#EXTM3U':
                var match = line.match(/region=(.*)\b/);
                if (match)
                    m3uRegion = match[1];
                break;
            case '#EXTINF':
                var match = line.match(/#EXTINF:.*,(.*)/);
                if (match)
                    m3uTitle = match[1].trim();
                match = line.match(/group-title="([\s\S]*?)"/);
                if (match) {
                    m3uGroup = match[1].trim();
                    if (groups.indexOf(m3uGroup) < 0)
                        groups.push(m3uGroup);
                }
                match = line.match(/tvg-logo=["|”]([\s\S]*?)["|”]/);
                if (match)
                    m3uImage = match[1].trim();
                match = line.match(/region="([\s\S]*?)"/);
                if (match)
                    m3uRegion = match[1];
                if (m3uRegion) {
                    match = line.match(/description="([\s\S]*?)"/);
                    if (match)
                        m3uEpgId = match[1];
                }
                break;
            case '#EXTGRP':
                var match = line.match(/#EXTGRP:(.*)/);
                if (match) {
                    m3uGroup = match[1].trim();
                    if (groups.indexOf(m3uGroup) < 0)
                        groups.push(m3uGroup);
                }
                break;
            default:
                if (line[0] == '#') {
                    m3uImage = '';
                    continue; // skip unknown tags and comments
                }
                line = line.replace(/rtmp:\/\/\$OPT:rtmp-raw=/, '');
                if (line.indexOf(':') == -1 && line.length == 40)
                    line = 'acestream://' + line;
                if (m3uImage && m3uImage.substr(0, 4) != 'http')
                    m3uImage = line.match(/^.+?[^\/:](?=[?\/]|$)/) + '/' + m3uImage;
                m3uHeaders = line.match(/([\s\S]*?)\|([\s\S]*?)$/);
                m3uHeaders ? line = m3uHeaders[1] : '';
                m3uItems.push({
                    title: m3uTitle ? m3uTitle : line,
                    url: line,
                    group: m3uGroup,
                    logo: m3uImage,
                    region: m3uRegion,
                    epgid: m3uEpgId,
                    headers: m3uHeaders ? m3uHeaders[2] : void(0)
                });
                m3uUrl = '', m3uTitle = '', m3uImage = '', m3uEpgId = '', m3uHeaders = ''; //, m3uGroup = '';
        }
    }
    page.metadata.title = title;
}

function addItem(page, url, title, icon, description, genre, epgForTitle, headers) {
    if (!epgForTitle) epgForTitle = '';
    var type = 'video';
    var link = url.match(/([\s\S]*?):(.*)/);
    var linkUrl = 0; 
    var playlistType = isPlaylist(url);
    if (link && playlistType) {
        link = linkUrl = playlistType + ':' + encodeURIComponent(url) + ":" + escape(title);
        type = 'directory'
    } else 
        if (link && !link[1].toUpperCase().match(/HTTP/) && !link[1].toUpperCase().match(/RTMP/))
            link = linkUrl = plugin.id + ':' + url + ':' + escape(title);
        else {
            linkUrl = url.toUpperCase().match(/M3U8/) || url.toUpperCase().match(/\.SMIL/) ? 'hls:' + url : url;
            link = "videoparams:" + JSON.stringify({
                title: title,
                icon: icon ? icon : void(0),
                sources: [{
                    url: linkUrl
                }],
                no_fs_scan: true,
                no_subtitle_scan: true
            });
        }

    // get icon from description
    if (!icon && description) {
        icon = description.match(/img src="([\s\S]*?)"/)
        if (icon) icon = icon[1];
    }
    if (!linkUrl) {
        var item = page.appendPassiveItem(type, '', {
            title: new RichText(title + epgForTitle),
            icon: icon ? icon : null,
            genre: genre,
            description: new RichText(description)
        });
    } else {
        if (headers)
            io.httpInspectorCreate('.*' + url.replace('http://', '').replace('https://', '').split(/[/?#]/)[0].replace(/\./g, '\\.') + '.*', function(req) {
                var tmp = headers.split('|');
                for (i in tmp) {
                    var header = unescape(tmp[i].replace(/\"/g, '')).match(/([\s\S]*?)=([\s\S]*?)$/);   
                    if (header)
                       req.setHeader(header[1], header[2]);
                }
            });
        var item = page.appendItem(link, type, {
			title: new RichText(title + epgForTitle),
			// Adds color title: new RichText((title ? coloredStr('Something: ', red) + title : '') + epgForTitle),
            icon: icon ? icon : null,
            genre: genre,
            description: new RichText((title ? coloredStr('Ver ahora en PS3FLIX: ', red) + title : '') +
                (description ? 'Descrisão?? ONDE' + description : 'Tem aqui tbm'))
        });
        addOptionForAddingToMyFavorites(item, link, title, icon);
    }
}

function isPlaylist(pl) {
    pl = unescape(pl).toUpperCase();
    var extension = pl.split('.').pop();
    var lastPart = pl.split("/").pop();
    if (pl.substr(0, 4) == 'XML:') 
        return 'xml';
    if (pl.substr(0, 4) == 'M3U:' || (extension == 'M3U' && pl.substr(0, 4) != 'HLS:') || lastPart == 'PLAYLIST' || 
        pl.match(/TYPE=M3U/) || pl.match(/BIT.DO/) || pl.match(/BIT.LY/) || pl.match(/GOO.GL/) || 
	pl.match(/TINYURL.COM/) || pl.match(/RAW.GITHUB/)) 
        return 'm3u';
    return false;
}

function showM3U(page, pl) {
    var num = 0;
    for (var i in groups) {
	if (groups[i])
            page.appendItem('m3uGroup:' + pl + ':' + encodeURIComponent(groups[i]), "directory", {
                title: groups[i]
            });
        num++;
    }

    for (var i in m3uItems) {
        if (m3uItems[i].group)
            continue;
        var extension = m3uItems[i].url.split('.').pop().toUpperCase();
        if (isPlaylist(m3uItems[i].url) || (m3uItems[i].url == m3uItems[i].title)) {
            var route = 'm3u:';
            if (m3uItems[i].url.substr(0, 4) == 'xml:') {
                m3uItems[i].url = m3uItems[i].url.replace('xml:', '');
                route = 'xml:';
            }
            if (m3uItems[i].url.substr(0, 4) == 'm3u:')
                m3uItems[i].url = m3uItems[i].url.replace('m3u:', '');
            page.appendItem(route + encodeURIComponent(m3uItems[i].url) + ':' + encodeURIComponent(m3uItems[i].title), "directory", {
                title: m3uItems[i].title
            });
            num++;
        } else {
            var description = '';
            if (m3uItems[i].region && m3uItems[i].epgid)
                description = getEpg(m3uItems[i].region, m3uItems[i].epgid);
            addItem(page, m3uItems[i].url, m3uItems[i].title, m3uItems[i].logo, description, '', epgForTitle, m3uItems[i].headers);
            epgForTitle = '';
            num++;
        }
        page.metadata.title = 'Adding item ' + num + ' of ' + m3uItems.length;
    }
    return num;
}

new page.Route('m3u:(.*):(.*)', function(page, pl, title) {
    setPageHeader(page, unescape(title));
    page.loading = true;
    readAndParseM3U(page, pl);
    page.metadata.title = new RichText(decodeURIComponent(title) + ' (' + showM3U(page, pl) + ')');
    page.loading = false;
});

var XML = require('showtime/xml');

function setColors(s) {
    if (!s) return '';
    return s.toString().replace(/="##/g, '="#').replace(/="lime"/g,
        '="#32CD32"').replace(/="aqua"/g, '="#00FFFF"').replace(/='green'/g,
        '="#00FF00"').replace(/='cyan'/g, '="#00FFFF"').replace(/="LightSalmon"/g,
        '="#ffa07a"').replace(/="PaleGoldenrod"/g, '="#eee8aa"').replace(/="Aquamarine"/g,
        '="#7fffd4"').replace(/="LightSkyBlue"/g, '="#87cefa"').replace(/="palegreen"/g,
        '="#98fb98"').replace(/="yellow"/g, '="#FFFF00"').replace(/font color=""/g, 'font color="#FFFFFF"');
}

new page.Route(plugin.id + ':parse:(.*):(.*)', function(page, parser, title) {
    setPageHeader(page, unescape(title));
    page.loading = true;
    var n = 1;
    log('Parser is: ' + unescape(parser));
    var params = unescape(parser).split('|');
    log('Requesting: ' + params[0]);
    if (!params[0]) {
        page.error('The link is empty');
        return;
    }
    var html = http.request(params[0]).toString();
    var base_url = params[0].match(/^.+?[^\/:](?=[?\/]|$)/);
    if (params.length > 1) {
        var start = html.indexOf(params[1]) + params[1].length;
        var length = html.indexOf(params[2], start) - start;
        var url = html.substr(start, length).split(',');
        log('Found URL: ' + url);
        //var urlCheck = params[1].replace(/\\\//g, '/') + url + params[2].replace(/\\\//g, '/');
        //if (urlCheck.match(/(http.*)/))
        //    url = urlCheck.match(/(http.*)/)[1];
        if (!url[0].trim()) {
            url = html.match(/pl:"([\s\S]*?)"/)[1];
            log('Fetching URL from pl: ' + url);
            var json = JSON.parse(http.request(url));
        } else if (url[0].trim().substr(0, 4) != 'http') {
            if (url[0][0] == '/') {
                page.appendItem(base_url + url[0], 'video', {
                    title: new RichText(unescape(title))
                });
            } else {
                url = url[0].match(/value="([\s\S]*?)"/);
                if (url) {
                    url = url[1];
                    log('Fetching URL from value: ' + url);
                    var json = JSON.parse(http.request(url));
                    log(JSON.stringify(json));
                    for (var i in json.playlist) {
                        if (json.playlist[i].file) {
                            page.appendItem(json.playlist[i].file.split(' ')[0], 'video', {
                                title: new RichText(json.playlist[i].comment)
                            });
                        }
                        for (var j in json.playlist[i].playlist) {
                            //log(json.playlist[i].playlist[j].comment);
                            page.appendItem(json.playlist[i].playlist[j].file.split(' ')[0], 'video', {
                                title: new RichText(json.playlist[i].comment + ' - ' + json.playlist[i].playlist[j].comment)
                            });
                        }
                    }
                } else {
                    log('Fetching URL from file":": ' + url);
                    var file = html.match(/file":"([\s\S]*?)"/);
                    if (file) {
                        page.appendItem(file[1].replace(/\\\//g, '/'), 'video', {
                            title: new RichText(unescape(title))
                        });
                    } else {
                        log('Fetching URL from pl":": ' + url);
                        var pl = html.match(/pl":"([\s\S]*?)"/)[1].replace(/\\\//g, '/');
                        var json = JSON.parse(http.request(pl).toString().trim());
                        for (var i in json.playlist) {
                            if (json.playlist[i].file) {
                                page.appendItem(json.playlist[i].file.split(' ')[0], 'video', {
                                    title: new RichText(json.playlist[i].comment)
                                });
                            }
                            for (var j in json.playlist[i].playlist) {
                                //log(json.playlist[i].playlist[j].comment);
                                page.appendItem(json.playlist[i].playlist[j].file.split(' ')[0], 'video', {
                                    title: new RichText(json.playlist[i].comment + ' - ' + json.playlist[i].playlist[j].comment)
                                });
                            }
                        }
                    }
                }
            }
        } else {
            for (i in url) {
                page.appendItem(url[i], 'video', {
                    title: new RichText(unescape(title) + ' #' + n)
                });
                n++;
            }
        }
    } else {
        html = html.split('\n');
        for (var i = 0; i < html.length; i++) {
            if (!html[i].trim()) continue;
            page.appendItem(html[i].trim(), 'video', {
                title: new RichText(unescape(title) + ' #' + n)
            });
            n++;
        }
    }
    page.loading = false;
});

var epgForTitle = '';

function getEpg(region, channelId) {
    var description = '';
    if (service.disableEPG) return description;
    try {
        var epg = http.request('https://tv.yandex.ua/' + region + '/channels/' + channelId);
        // 1-time, 2-title
        var re = /tv-event_wanna-see_check i-bem[\s\S]*?<span class="tv-event__time">([\s\S]*?)<\/span><div class="tv-event__title"><div class="tv-event__title-inner">([\s\S]*?)<\/div>/g;
        var match = re.exec(epg);
        var first = true;
        while (match) {
            if (first) {
                epgForTitle = coloredStr(' (' + match[1] + ') ' + match[2], orange);
                first = false;
            }
            description += '<br>' + match[1] + coloredStr(' - ' + match[2], orange);
            match = re.exec(epg);
        }
    } catch (err) {}
    return description;
}

new page.Route('xml:(.*):(.*)', function(page, pl, pageTitle) {
    log('Main list: ' + decodeURIComponent(pl).trim());
    setPageHeader(page, unescape(pageTitle));
    page.loading = true;
    try {
        var doc = XML.parse(http.request(decodeURIComponent(pl)));
    } catch (err) {
        page.error(err);
        return;
    }
    if (!doc.items) {
        page.error('Cannot get proper xml file');
        return;
    }

    var categories = [];
    var category = doc.items.filterNodes('category');
    for (var i = 0; i < category.length; i++)
        categories[category[i].category_id] = category[i].category_title;

    var channels = doc.items.filterNodes('channel');
    var num = 0;
    for (var i = 0; i < channels.length; i++) {
        var title = string.entityDecode(channels[i].title);
        title = setColors(title);
        var playlist = channels[i].playlist_url;
        var description = channels[i].description ? channels[i].description : null;
        description = setColors(description);

        var icon = null;
        if (channels[i].logo_30x30 && channels[i].logo_30x30.substr(0, 4) == 'http')
            icon = channels[i].logo_30x30;
        if (!icon && channels[i].logo && channels[i].logo.substr(0, 4) == 'http')
            icon = channels[i].logo;
        if (!icon && description) {
            icon = description.match(/src="([\s\S]*?)"/)
            if (icon) icon = string.entityDecode(icon[1]);
        }

        // show epg if available
        epgForTitle = '';
        if (channels[i].region && +channels[i].description)
            description = getEpg(channels[i].region, channels[i].description);
        description = description.replace(/<img[\s\S]*?src=[\s\S]*?(>|$)/, '').replace(/\t/g, '').replace(/\n/g, '').trim();

        genre = channels[i].category_id ? categories[channels[i].category_id] : null;
        if (playlist && playlist != 'null' && !channels[i].parser) {
            var extension = playlist.split('.').pop().toLowerCase();
            if (playlist.match(/m3u8/)) extension = 'm3u';
            if (extension != 'm3u')
                extension = 'xml';
            var url = extension + ':' + encodeURIComponent(playlist) + ':' + escape(title);
            page.appendItem(url, 'video', {
                title: new RichText(title + epgForTitle),
                icon: icon,
                genre: genre,
                description: new RichText((playlist ? coloredStr('Link: ', orange) + playlist + '\n' : '') + description)
            });
        } else {
            if (channels[i].parser)
                page.appendItem(plugin.id + ':parse:' + escape(channels[i].parser) + ':' + escape(title), 'directory', {
                    title: new RichText(title + epgForTitle),
                    genre: genre
                });
            else {
                var url = channels[i].stream_url ? channels[i].stream_url : '';
                var match = url.match(/http:\/\/www.youtube.com\/watch\?v=(.*)/);
                if (match) {
                    url = 'youtube:video:' + match[1];
                    page.appendItem(url, 'video', {
                        title: title + epgForTitle,
                        icon: icon,
                        genre: genre,
                        description: new RichText(coloredStr('Link: ', orange) + url)
                    });
                } else
                    addItem(page, url, title, icon, description, genre, epgForTitle);
            }
        }
        num++;
    }
    page.metadata.title = new RichText(unescape(pageTitle) + ' (' + num + ')');
    page.loading = false;
});

function log(str) {
    if (service.debug) {
        console.log(str);
        print(str);
    }
}

// Search IMDB ID by title
function getIMDBid(title) {
    var imdbid = null;
    var title = string.entityDecode(unescape(title)).toString();
    log('Splitting the title for IMDB ID request: ' + title);
    var splittedTitle = title.split('|');
    if (splittedTitle.length == 1)
        splittedTitle = title.split('/');
    if (splittedTitle.length == 1)
        splittedTitle = title.split('-');
    log('Splitted title is: ' + splittedTitle);
    if (splittedTitle[1]) { // first we look by original title
        var cleanTitle = splittedTitle[1]; //.trim();
        var match = cleanTitle.match(/[^\(|\[|\.]*/);
        if (match)
            cleanTitle = match;
        log('Trying to get IMDB ID for: ' + cleanTitle);
        resp = http.request('http://www.imdb.com/find?ref_=nv_sr_fn&q=' + encodeURIComponent(cleanTitle)).toString();
        imdbid = resp.match(/class="findResult[\s\S]*?<a href="\/title\/(tt\d+)\//);
        if (!imdbid && cleanTitle.indexOf('/') != -1) {
            splittedTitle2 = cleanTitle.split('/');
            for (var i in splittedTitle2) {
                log('Trying to get IMDB ID (1st attempt) for: ' + splittedTitle2[i].trim());
                resp = http.request('http://www.imdb.com/find?ref_=nv_sr_fn&q=' + encodeURIComponent(splittedTitle2[i].trim())).toString();
                imdbid = resp.match(/class="findResult[\s\S]*?<a href="\/title\/(tt\d+)\//);
                if (imdbid) break;
            }
        }
    }
    if (!imdbid)
        for (var i in splittedTitle) {
            if (i == 1) continue; // we already checked that
            var cleanTitle = splittedTitle[i].trim();
            var match = cleanTitle.match(/[^\(|\[|\.]*/);
            if (match)
                cleanTitle = match;
            log('Trying to get IMDB ID (2nd attempt) for: ' + cleanTitle);
            resp = http.request('http://www.imdb.com/find?ref_=nv_sr_fn&q=' + encodeURIComponent(cleanTitle)).toString();
            imdbid = resp.match(/class="findResult[\s\S]*?<a href="\/title\/(tt\d+)\//);
            if (imdbid) break;
        }

    if (imdbid) {
        log('Got following IMDB ID: ' + imdbid[1]);
        return imdbid[1];
    }
    log('Cannot get IMDB ID :(');
    return imdbid;
};

new page.Route(plugin.id + ":streamlive:(.*):(.*):(.*)", function(page, url, title, icon) {
    page.loading = true;
    var doc = http.request(unescape(url)).toString();
    var imdbid = lnk = scansubs = 0;
    var mimetype = 'video/quicktime';
    var direct = doc.match(/"false" type="text\/javascript">([\s\S]*?)<\/script>/);
    if (direct) {
        lnk = eval(direct[1]);
    } else {
        mimetype = 'application/vnd.apple.mpegurl'
        scansubs = true;
        var re = /return\(([\s\S]*?)innerHTML\)/g;
        var match = re.exec(doc);
        while (match) {
            // 1-lnk, 2-array id, 3-inner id
            var tmp = match[1].match(/return\(\[([\s\S]*?)\][\s\S]*?\+ ([\s\S]*?)\.[\s\S]*?getElementById\("([\s\S]*?)"\)\./);
            if (tmp) {
                lnk = 'https:' + tmp[1].replace(/[",\s]/g, '').replace(/\\\//g, '/');
                var re2 = new RegExp(tmp[2] + ' = ([\\s\\S]*?);');
                var tmp2 = re2.exec(doc);
                lnk += tmp2[1].replace(/[\[\]",\s]/g, '');
                re2 = new RegExp(tmp[3] + '>([\\s\\S]*?)<\/span>');
                tmp2 = re2.exec(doc);
                lnk += tmp2[1];
                log(lnk);

            }
            match = re.exec(doc);
        }
    }
    playUrl(page, lnk, plugin.id + ':streamlive:' + url + ':' + title, unescape(title), mimetype, icon, !scansubs, imdbid);
});

new page.Route(plugin.id + ":streamliveStart", function(page) {
    setPageHeader(page, 'StreamLive.to');
    page.loading = true;

    io.httpInspectorCreate('.*streamlive\\.to.*', function(req) {
        req.setHeader('Host', req.url.replace('http://', '').replace('https://', '').split(/[/?#]/)[0]);
        req.setHeader('Origin', 'https://www.streamlive.to');
        req.setHeader('Referer', 'https://www.streamlive.to/channels?list=free');
        //req.setHeader('X-Requested-With', 'XMLHttpRequest');
        req.setHeader('User-Agent', UA);
    });

    var fromPage = 1,
        tryToSearch = true;
    page.entries = 0;

    function loader() {
        if (!tryToSearch) return false;
        page.loading = true;
        var doc = http.request('https://www.streamlive.to/channelsPages.php', {
            postdata: {
                page: fromPage,
                category: '',
                language: '',
                sortBy: 1,
                query: '',
                list: 'free'
            }
        }).toString();
        page.loading = false;

        // 1-icon, 2-title, 3-what's on, 4-viewers, 5-totalviews, 6-genre, 7-language, 8-link
        //1-link, 2-title, 3-icon, 4-language, 5-description, 6-viewers, 7-totalviews, 8-genre
        var re = /class="ml-item"[\s\S]*?href="([\s\S]*?)"[\s\S]*?title="([\s\S]*?)">[\s\S]*?src="([\s\S]*?)"[\s\S]*?class="jt-info">Language: ([\s\S]*?)<\/div>[\s\S]*?class="f-desc">([\s\S]*?)<\/p>[\s\S]*?<a href="#">([\s\S]*?)<\/a>[\s\S]*?<a href="#">([\s\S]*?)<\/a>[\s\S]*?<a href="#">([\s\S]*?)<\/a>/g;
        match = re.exec(doc);
        var added = 0;
        while (match) {
            page.appendItem(plugin.id + ':streamlive:' + escape(match[1]) + ':' + escape(trim(match[2])) + ':' + escape('https:' + match[3]), "video", {
                title: trim(match[2]),
                icon: 'https:' + match[3],
                genre: new RichText(trim(match[8]) + coloredStr('<br>Language: ', orange) + trim(match[4])),
                tagline: new RichText((trim(match[5]) ? coloredStr('Now: ', orange) + trim(match[5].replace(/&nbsp;/g, '')).replace(/^"|"$/g, '') : '')),
                description: new RichText(
                    coloredStr('Viewers: ', orange) + trim(match[6]) +
                    coloredStr(' Total views: ', orange) + trim(match[7]))
            });
            match = re.exec(doc);
            page.entries++;
            added++;
        };
        page.metadata.title = 'StreamLive.to (' + page.entries + ')';
        if (!added) return tryToSearch = false;
        fromPage++;
        return true;
    }
    loader();
    page.paginator = loader;
    page.loading = false;
});

function addActionToTheItem(page, menuText, id, type) {
    page.options.createAction('addPlaylist' + type, menuText, function() {
        var result = popup.textDialog('Enter the URL to the playlist like:\n' +
            'http://bit.ly/' + id + ' or just bit.ly/' + id + ' or ' + id, true, true);
        if (!result.rejected && result.input) {
            var link = result.input;
            if (!link.match(/\./))
                link = 'http://bit.ly/' + link;
            if (!link.match(/:\/\//))
                link = 'http://' + link;
            var result = popup.textDialog('Enter the name of the playlist:', true, true);
            if (!result.rejected && result.input) {
                var entry = JSON.stringify({
                    title: encodeURIComponent(result.input),
                    link: type.toLowerCase() + ':' + encodeURIComponent(link)
                });
                playlists.list = JSON.stringify([entry].concat(eval(playlists.list)));
                popup.notify("Playlist '" + result.input + "' has been added to the list.", 2);
                page.flush();
                page.redirect(plugin.id + ':start');
            }
        }
    });
}

var idcJson;

new page.Route(plugin.id + ":idcPlay:(.*):(.*)", function(page, id, title) {
    page.loading = true;
    var json = JSON.parse(http.request('http://iptvn.idc.md/api/json/get_url?cid=' + id));
    playUrl(page, unescape(json.url).replace('http/ts', 'http'), plugin.id + ':idcPlay:' + id + ':' + title, decodeURI(title), 'video/mp2t');
});


function getEpgPeriod(ts1, ts2, epg) {
    if (!ts1 || !ts2 || !epg) return '';

    function tsToTime(ts) {
        var a = new Date(ts * 1000);
        return (a.getHours() < 10 ? '0' + a.getHours() : a.getHours()) + ':' + (a.getMinutes() < 10 ? '0' + a.getMinutes() : a.getMinutes());
    }
    return ' (' + tsToTime(ts1) + '-' + tsToTime(ts2) + ') ' + epg;
}

new page.Route(plugin.id + ":idcGroups:(.*)", function(page, id) {
    page.loading = true;
    var counter = 0;
    if (!idcJson) getIdc(page, 'https://iptvn.idc.md/api/json/channel_list');
    for (var i in idcJson.groups) {
        if (idcJson.groups[i].id != id)
            continue;
        if (counter == 0)
            setPageHeader(page, coloredStr(decodeURI(idcJson.groups[i].name), idcJson.groups[i].color.replace('#000000', '#FFFFFF')));
        for (var j in idcJson.groups[i].channels) {
            var lines = decodeURI(idcJson.groups[i].channels[j].epg_progname).split('\n');
            page.appendItem(plugin.id + ":idcPlay:" + idcJson.groups[i].channels[j].id + ':' + idcJson.groups[i].channels[j].name, "video", {
                title: new RichText(decodeURI(idcJson.groups[i].channels[j].name) +
                    coloredStr(getEpgPeriod(idcJson.groups[i].channels[j].epg_start, idcJson.groups[i].channels[j].epg_end, lines[0]), orange)),
                icon: 'http://iptvn.idc.md' + idcJson.groups[i].channels[j].icon,
                description: idcJson.groups[i].channels[j].epg_progname ? decodeURI(idcJson.groups[i].channels[j].epg_progname) : null
            });
            counter++;
        }
        break;
    };
    page.metadata.title = new RichText(page.metadata.title + ' (' + counter + ')');
    page.loading = false;
});

function getIdc(page, url) {
    showDialog = false;
    while (1) {
        page.loading = true;
        idcJson = JSON.parse(http.request(url));
        if (!idcJson.error)
            return true;

        while (1) {
            page.loading = false;
            var credentials = popup.getAuthCredentials(plugin.id, 'Idc.md requires login to continue', showDialog, 'idc');
            if (credentials.rejected) {
                page.error('Cannot continue without login/password :(');
                return false;
            }

            if (credentials && credentials.username && credentials.password) {
                page.loading = true;
                var resp = JSON.parse(http.request('https://iptvn.idc.md/api/json/login', {
                    postdata: {
                        login: credentials.username,
                        pass: credentials.password,
                        settings: 'all'
                    }
                }));
                page.loading = false;
                if (!resp.error) break;
                popup.message(resp.error.message, true);
            }
            showDialog = true;
        }
    }
}

new page.Route(plugin.id + ":idcStart", function(page) {
    setPageHeader(page, 'Idc.md');
    page.loading = true;
    if (!getIdc(page, 'https://iptvn.idc.md/api/json/channel_list')) return;
    var counter = 0;
    for (var i in idcJson.groups) {
        page.appendItem(plugin.id + ":idcGroups:" + idcJson.groups[i].id, "directory", {
            title: new RichText(coloredStr(decodeURI(idcJson.groups[i].name), idcJson.groups[i].color.replace('#000000', '#FFFFFF')))
        });
        counter++;
    };
    page.metadata.title = 'Idc.md (' + counter + ')';
    page.loading = false;
});

new page.Route(plugin.id + ":playgoAtDee:(.*):(.*)", function(page, url, title) {
    page.loading = true;
    page.metadata.title = unescape(title);
    var link = null;
    var doc = http.request('http://goatd.net/' + unescape(url)).toString();
    match = doc.match(/swidth=[\s\S]*?src="([\s\S]*?)"/); // extract embed url
    if (match) {
        log(match[1]);
        doc = http.request(match[1], { // loading document.write redirect page
            headers: {
                Host: 'www.sawlive.tv',
                Referer: 'http://goatd.net/' + unescape(url),
                'User-Agent': UA
            }
        }).toString();
        match = doc.match(/var[\s\S]*?"([\s\S]*?);([\s\S]*?)"/);
        // fetching crypted html
        var referer = 'http://www.sawlive.tv/embed/stream/' + match[2] + '/' + match[1];
        doc = http.request(referer, {
            headers: {
                Host: 'www.sawlive.tv',
                Referer: 'http://goatd.net/' + unescape(url),
                'User-Agent': UA
            },
            debug: service.debug
        }).toString();
        log(doc);

        // 1-streamer, 2-playpath
        match = doc.match(/sowrite\("[\s\S]*?", "([\s\S]*?)", "([\s\S]*?)"/);
        if (match) {
            var playpath = match[1].replace('17264311', '').replace('11123346', '');
            var link = match[2] + ' playpath=' + playpath + ' swfUrl=http://static3.sawlive.tv/player.swf pageUrl=' + referer;
        }
    }
    playUrl(page, link, plugin.id + ':playgoAtDee:' + url + ':' + title, unescape(title));
});

new page.Route(plugin.id + ":goAtDeeStart", function(page) {
    setPageHeader(page, 'goATDee.Net');
    page.loading = true;
    var doc = http.request('http://goatd.net').toString();
    page.appendItem("", "separator", {
        title: doc.match(/<b>([\s\S]*?)<\/b>/)[1]
    });
    // 1-am/pm time, 2-est time, 3-icon, 4-link, 5-title, 6-cet time
    var re = /<td align="right"><b>([\s\S]*?)<\/b><\/td><td align="left"><b>([\s\S]*?)<\/b><\/td>[\s\S]*?<img src="([\s\S]*?)"[\s\S]*?<a href="([\s\S]*?)"[\s\S]*?blank">([\s\S]*?)<\/a>([\s\S]*?)<\/tr>/g;
    // 1- 6-24h time, 2-cet time
    var re2 = /<td align="right"><b>([\s\S]*?)<\/b><\/td><td align="left"><b>([\s\S]*?)<\/b>/;
    var match = re.exec(doc);
    while (match) {
										  
        var params = re2.exec(match[6]);
        cet = '';
        if (params)
            cet = ' / ' + params[1] + ' ' + params[2];
        page.appendItem(plugin.id + ":playgoAtDee:" + escape(match[4]) + ':' + escape(match[5]), "video", {
		 
																	 
										   
						
            title: new RichText(match[5] + (match[1] ? coloredStr(' ' + match[1] + ' ' + match[2] + cet, orange) : '')),
            icon: match[3],
            description: new RichText(match[5] + (match[1] ? coloredStr(' ' + match[1] + ' ' + match[2] + cet, orange) : ''))
        });
							
        match = re.exec(doc);
    }
    page.loading = false;
});

new page.Route(plugin.id + ":loadOnePlaylist", function(page) {
    setPageHeader(page, 'FILMES ZTVMOD');
    page.loading = true;
    page.metadata.title = 'Cargando el Contenido de PS3FLIX...';
    var m3u = http.request('https://ztvmod.blogspot.com/p/filmes.html').toString();
    page.metadata.title = 'Processing the playlist...';
    m3u = m3u.match(/<div style="[\s\S]*?">([\s\S]*?)<\/div>/)[1].split('<br />')
    readAndParseM3U(page, 0, m3u);
    page.metadata.title =  'FILMES ZTVMOD (' + showM3U(page) + ')';
    page.loading = false;
});



new page.Route(plugin.id + ":onePlaylistStart", function(page) {
    setPageHeader(page, 'Oneplaylist.space - Stream Database');
    page.loading = true;
    page.appendItem(plugin.id + ':loadOnePlaylist', "directory", {
        title: 'FILMES ZTVMOD'
    });

    var doc = http.request('https://ztvmod.blogspot.com/p/desenhos.html').toString();

    page.appendItem("", "separator", {
        title: 'SEJA BEM VINDO AOS FAVORITOS DO ZÉ'
    });
    //1-title, 2-link
    var re = /<span style="color:#000">([\s\S]*?) \| <\/span><span style="color:#06C">([\s\S]*?)<\/span>/g;
    var match = re.exec(doc);
    while (match) {
        addItem(page, match[2], match[1]);
        match = re.exec(doc);
    }
    page.loading = false;
});

// Start page
new page.Route(plugin.id + ":start", function(page) {
    page.model.contents = 'grid';
    setPageHeader(page, plugin.title);
    page.metadata.icon = logo;
    
    if (!service.disableMyFavorites) {
        page.appendItem(plugin.id + ":favorites", "directory", {
            title: "My Favorites"
        });
    }

    page.appendItem("", "separator", {
        title: '.:: Categories ::.'
    });
   page.appendItem("", "separator", {
        title: ' '
    });

    addActionToTheItem(page, 'Agregar Lista M3U', 'Pon tu codigo', 'M3U');
    addActionToTheItem(page, 'Agregar Lista XML', 'Pon tu codigo');

    // menu to delete playlists
    page.options.createAction('rmPlaylist', 'Delete List...', function() {
        var list = eval(playlists.list);
        for (var i in list) {
            var result = popup.message("Seguro quieres borrar esta lista '" + decodeURIComponent(JSON.parse(list[i]).title) + "' playlist?", true, true);
            if (result) {
                popup.notify("'" + decodeURIComponent(JSON.parse(list[i]).title) + "' Lista Borrada.", 2);
                list.splice(i, 1);
                playlists.list = JSON.stringify(list);
                page.flush();
                page.redirect(plugin.id + ':start');
            }
        }
        if (!i) popup.notify('No Content to be deleted.', 2);
    });

    showPlaylist(page);
	page.model.contents = 'grid';

	if (!service.disableSampleXMLList) {
			page.model.contents = 'grid';
        var item = page.appendItem('m3u:https://meups3.netlify.app//PlaystationTV/animes.m3u:Animes', "directory", {
            title: 'Animes',
			icon: 'http://dl.dropboxusercontent.com/s/l6g1eh6u7pum2ms/animes.png'
        });
    }
	
	if (!service.disableSampleXMLList) {
			page.model.contents = 'grid';
        var item = page.appendItem('m3u:https://meups3.netlify.app//PlaystationTV/cartoons.m3u:Cartoons', "directory", {
            title: 'Documentários',
			icon: 'https://raw.githubusercontent.com/ss-iptv/ps3tv/9a592b8677b134e39b5d900151d08a09281dea6f/PlaystationTV/documentarios.png'
        });
    }
	
    if (!service.disableSampleList) {
			page.model.contents = 'grid';
		var item = page.appendItem('m3u:https://meups3.netlify.app//PlaystationTV/movies.m3u:Movies', "directory", {
            title: 'Filmes',
			icon: 'http://dl.dropboxusercontent.com/s/keslqtvsuk2kjkm/movies.png'
        });
    }

    if (!service.disableSampleXMLList) {
			page.model.contents = 'grid';
        var item = page.appendItem('m3u:https://meups3.netlify.app//PlaystationTV/series.m3u:Series', "directory", {
            title: 'Séries',
			icon: 'http://dl.dropboxusercontent.com/s/jbhusj3sabsbrkg/series.png'
        });
    }
	if (!service.disableSampleXMLList) {
	 	page.model.contents = 'grid';
        var item = page.appendItem('m3u:https://meups3.netlify.app//PlaystationTV/music.m3u:Music', "directory", {
            title: 'Música',
			icon: 'http://dl.dropboxusercontent.com/s/xurt6f48tevby43/music.png'
        });
    }    
	if (!service.disableSampleList) {
			page.model.contents = 'grid';
        var item = page.appendItem('m3u:https://meups3.netlify.app//PlaystationTV/iptv.m3u:IPTV', "directory", {
            title: 'TV',
			icon: 'http://dl.dropboxusercontent.com/s/2j82223y4mqxcw3/iptv.png'
        });
    }
    
	if (!service.disableProviderList) {
        page.appendItem("", "separator", {
            title: 'Providers'
        });
        page.appendItem(plugin.id + ":onePlaylistStart", "directory", {
            title: "Oneplaylist.space",
            icon: 'https://archive.org/download/ps3flix_img/01.jpg'
        });
        page.appendItem(plugin.id + ":streamliveStart", "directory", {
            title: "StreamLive.to",
            icon: 'https://archive.org/download/ps3flix_img/02.jpg'
        });
        page.appendItem(plugin.id + ":tivixStart", "directory", {
            title: "Tivix.co",
            icon: 'https://archive.org/download/ps3flix_img/03.jpg'
        });
        page.appendItem(plugin.id + ":youtvStart", "directory", {
            title: "Youtv.com.ua",
            icon: 'https://archive.org/download/ps3flix_img/04.jpg'
        });
        page.appendItem(plugin.id + ":goAtDeeStart", "directory", {
            title: "goATDee.Net",
			con: 'https://archive.org/download/ps3flix_img/05.jpg'
        });
        page.appendItem(plugin.id + ":idcStart", "directory", {
            title: "Idc.md",
            icon: 'https://archive.org/download/ps3flix_img/01.jpg'
        });
    }
	    page.appendItem("", "separator", {
        title: '.:: Everything in just one place ::.'
    });
});
