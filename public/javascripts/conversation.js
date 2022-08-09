"use strict";

$(() => {
    var baseUrl = document.body.dataset.baseUrl;
    var thingpediaUrl = document.body.dataset.thingpediaUrl;
    var url = new URL('ws/conversation', location.href);
    if (url.protocol === 'https:')
        url.protocol = 'wss:';
    else
        url.protocol = 'ws:';
    url = url.toString();

    var ws;
    var open = false;

    var pastCommandsUp = []; // array accessed by pressing up arrow
    var pastCommandsDown = []; // array accessed by pressing down arrow
    var currCommand = ""; // current command between pastCommandsUp and pastCommandsDown

    var conversationId = null;
    var lastMessageId = -1;

    var container = $('#chat');
    var currentGrid = null;

    function updateConnectionFeedback() {
        if (!ws || !open) {
            $('#input-form-group').addClass('has-warning');
            manageSpinner('remove');
            manageLostConnectionMsg('add');
            manageLostConnectionMsg('show');
            scrollChat();
            return;
        }

        $('#input-form-group').removeClass('has-warning');
        manageLostConnectionMsg('remove');
    }

    function updateSpinner(thinking) {
        if (!ws || !open)
            return;

        let to_do;

        if (thinking)
            to_do = 'show';
        else
            to_do = 'remove';

        manageSpinner(to_do);
    }

    function manageLostConnectionMsg(todo) {
        switch (todo) {
            case 'remove':
                $('#chat > .help-block').remove();
                break;
            case 'show':
                $('#chat > .help-block').removeClass('hidden');
                break;
            case 'add':
                $('#chat > .help-block').remove();
                $(".help-block").clone().appendTo("#chat").last();
                break;
        }
        return;
    }

    function manageSpinner(todo) {
        let last_elem = $(".from-user").last();
        switch (todo) {
            case 'remove':
                $('#chat > .almond-thinking').remove();
                break;
            case 'show':
                $('#chat > .almond-thinking').remove();
                $(".almond-thinking").clone().insertAfter(last_elem);
                $('#chat > .almond-thinking').removeClass('hidden');
                break;
        }
        return;
    }

    (function() {
        var reconnectTimeout = 100;

        function connect() {
            ws = new WebSocket(url);

            ws.onmessage = function(event) {
                if (!open) {
                    open = true;
                    reconnectTimeout = 100;
                    updateConnectionFeedback();
                }
                onWebsocketMessage(event);
            };

            ws.onclose = function() {
                console.error('Web socket closed');
                ws = undefined;
                open = false;
                updateConnectionFeedback();

                // reconnect immediately if the connection previously succeeded, otherwise
                // try again in a little bit
                if (open) {
                    setTimeout(connect, 100);
                } else {
                    reconnectTimeout = 1.5 * reconnectTimeout;
                    setTimeout(connect, reconnectTimeout);
                }
            };
        }

        connect();
    })();

    function syncCancelButton(msg) {
        var visible = msg.ask !== null;
        if (visible)
            $('#cancel').removeClass('hidden');
        else
            $('#cancel').addClass('hidden');
    }

    function almondMessage(icon) {
        var msg = $('<span>').addClass('message-container from-almond');
        icon = icon || 'org.thingpedia.builtin.thingengine.builtin';
        // var src = thingpediaUrl + '/api/v3/devices/icon/' + icon;
        var src = "https://img.icons8.com/fluency/240/000000/autodesk--v2.png" // add icon
        msg.append($('<img>').addClass('icon').attr('src', src));
        container.append(msg);

        addVoteButtons();
        manageLostConnectionMsg('add');
        manageSpinner('remove');
        scrollChat();
        return msg;
    }

    function addVoteButtons() {
        $('.comment-options').remove();
        $('#comment-block').val('');
        const upvote = $('<i>').addClass('far fa-thumbs-up').attr('id', 'upvoteLast');
        const downvote = $('<i>').addClass('far fa-thumbs-down').attr('id', 'downvoteLast');
        const comment = $('<i>').addClass('far fa-comment-alt').attr('id', 'commentLast')
            .attr('data-toggle', 'modal')
            .attr('data-target', '#comment-popup');
        upvote.click((event) => {
            $.post(baseUrl + '/recording/vote/up', {
                id: conversationId,
                _csrf: document.body.dataset.csrfToken
            }).then((res) => {
                if (res.status === 'ok') {
                    upvote.attr('class', 'fa fa-thumbs-up');
                    downvote.attr('class', 'far fa-thumbs-down');
                }
            });
            event.preventDefault();
        });
        downvote.click((event) => {
            $.post(baseUrl + '/recording/vote/down', {
                id: conversationId,
                _csrf: document.body.dataset.csrfToken
            }).then((res) => {
                if (res.status === 'ok') {
                    upvote.attr('class', 'far fa-thumbs-up');
                    downvote.attr('class', 'fa fa-thumbs-down');
                }
            });
            event.preventDefault();
        });
        const div = $('<span>').addClass('comment-options');
        div.append(upvote);
        div.append(downvote);
        div.append(comment);
        container.append(div);
        return div;
    }

    function maybeScroll(container) {
        if (!$('#input:focus').length)
            return;
        //keep scroll bar to the bottom
        scrollChat();
        setTimeout(scrollChat, 1000);
    }

    function scrollChat() {
        let chat = document.getElementById('chat');
        chat.scrollTop = chat.scrollHeight;
    }

    function textMessage(text, icon) {
        var container = almondMessage(icon);
        container.append($('<span>').addClass('message message-text')
            .text(text));
        maybeScroll(container);
    }

    function picture(url, icon) {
        var container = almondMessage(icon);
        container.append($('<img>').addClass('message message-picture')
            .attr('src', url));
        maybeScroll(container);
    }

    function rdl(rdl, icon) {
        var container = almondMessage(icon);
        var rdlMessage = $('<a>').addClass('message message-rdl')
            .attr('href', rdl.webCallback).attr("target", "_blank").attr("rel", "noopener nofollow");
        rdlMessage.append($('<span>').addClass('message-rdl-title')
            .text(rdl.displayTitle));
        if (rdl.pictureUrl) {
            rdlMessage.append($('<span>').addClass('message-rdl-content')
                .append($('<img>').attr('src', rdl.pictureUrl)));
        }
        rdlMessage.append($('<span>').addClass('message-rdl-content')
            .text(rdl.displayText));
        container.append(rdlMessage);

        maybeScroll(container);
    }

    function getGrid() {
        if (!currentGrid) {
            var wrapper = $('<div>').addClass('message-container button-grid container');
            currentGrid = $('<div>').addClass('row');
            wrapper.append(currentGrid);
            container.append(wrapper);
        }
        return currentGrid;
    }

    function choice(idx, title) {
        var holder = $('<div>').addClass('col-xs-12 col-sm-6');
        var btn = $('<a>').addClass('message message-choice btn btn-default')
            .attr('href', '#').text(title);
        btn.click((event) => {
            handleChoice(idx, title);
            event.preventDefault();
        });
        holder.append(btn);
        getGrid().append(holder);
        maybeScroll(holder);
    }

    function buttonMessage(title, json) {
        var holder = $('<div>').addClass('col-xs-12 col-sm-6');
        var btn = $('<a>').addClass('message message-button new-msg-button btn btn-default')
            .attr('href', '#').text(title);
        btn.click((event) => {
            handleParsedCommand(json, title);
            event.preventDefault();
        });
        holder.append(btn);
        getGrid().append(holder);
        maybeScroll(holder);
    }

    function linkMessage(title, url) {
        /*if (url === '/apps')
            url = '/me';
        else if (url.startsWith('/devices'))
            url = '/me' + url;*/

        var holder = $('<div>').addClass('col-xs-12 col-sm-6');
        var btn = $('<a>').addClass('message message-button new-msg-button btn btn-default')
            .attr('href', baseUrl + url).attr("target", "_blank").attr("rel", "noopener").text(title);
        holder.append(btn);
        getGrid().append(holder);
        maybeScroll(holder);
    }

    function yesnoMessage() {
        var holder = $('<div>').addClass('col-xs-6 col-sm-4 col-md-3');
        var btn = $('<a>').addClass('message message-yesno new-msg-button btn btn-default')
            .attr('href', '#').text("Yes");
        btn.click((event) => {
            handleSpecial('yes', "Yes");
            event.preventDefault();
        });
        holder.append(btn);
        getGrid().append(holder);
        holder = $('<div>').addClass('col-xs-6 col-sm-4 col-md-3');
        btn = $('<a>').addClass('message message-yesno new-msg-button btn btn-default')
            .attr('href', '#').text("No");
        btn.click(function(event) {
            handleSpecial('no', "No");
            event.preventDefault();
        });
        holder.append(btn);
        getGrid().append(holder);
        maybeScroll(holder);
    }

    function collapseButtons() {
        $('.message-button, .message-choice, .message-yesno').remove();
        $('.comment-options').remove();
    }

    function syncKeyboardType(ask) {
        if (ask === 'password')
            $('#input').attr('type', 'password');
        else
            $('#input').attr('type', 'text');
    }

    function onWebsocketMessage(event) {
        var parsed = JSON.parse(event.data);
        console.log('received ' + event.data);

        if (parsed.type === 'id') {
            conversationId = parsed.id;
            return;
        }

        if (parsed.type === 'askSpecial') {
            syncKeyboardType(parsed.ask);
            syncCancelButton(parsed);
            if (parsed.ask === 'yesno')
                yesnoMessage();
            updateSpinner(false);
            return;
        }
        if (parsed.type === 'hypothesis') {
            $('#input').val(parsed.hypothesis);
            return;
        }

        if (parsed.id <= lastMessageId)
            return;
        lastMessageId = parsed.id;

        switch (parsed.type) {
            case 'new-program':
                console.log("TK: ", parsed.code);
                if (parsed.code == '@arc.layout() filter count(social) == 1 && count(visitor) == 1 && count(working) == 1;') init(load_data(json1));
                else if(parsed.code =='@arc.nearBy() filter space1 == "social"^^arc:zone("social zone") && zone1 == "working"^^arc:zone("working zone");') init(load_data(json2));
                else if(parsed.code =='@arc.working() filter count(desk) == 3 && count(meeting) == 4 && count(office) == 5;') init(load_data(json3));
                else if(parsed.code =='@arc.connect() filter space1 == "office"^^arc:space("offices") && space2 == "window"^^arc:space("windows");') init(load_data(json4));
                else if(parsed.code =='@arc.desk() filter in_zone == "working"^^arc:zone("working zone") && location == "center"^^arc:location("center");') init(load_data(json5));
                textMessage("ThingTalk executable command: "+parsed.code, parsed.icon);
                ws.send(JSON.stringify({ type: 'command', text: "thank you" }));
                break;
            case 'text':
            case 'result':
                // textMessage(parsed.text, parsed.icon);
                currentGrid = null;
                break;

            case 'picture':
                picture(parsed.url, parsed.icon);
                currentGrid = null;
                break;

            case 'rdl':
                rdl(parsed.rdl, parsed.icon);
                currentGrid = null;
                break;

            case 'choice':
                choice(parsed.idx, parsed.title);
                break;

            case 'button':
                buttonMessage(parsed.title, parsed.json);
                break;

            case 'link':
                linkMessage(parsed.title, parsed.url);
                break;

            case 'command':
                $('#input').val('');
                collapseButtons();
                if (parsed.command != "thank you"){
                    appendUserMessage(parsed.command);
                }
                // appendUserMessage(parsed.command);
                break;
        }
        
        var json1 = {"nodes":[{"id":"working","name":"Working Zone","group":"working"}, {"id":"visitor","name":"Visitor Zone","group":"visitor"}, {"id":"social","name":"Social Zone","group":"social"}],"links":[]};
        var json2 = {"nodes":[{"id":"working","name":"Working Zone","group":"working"}, {"id":"visitor","name":"Visitor Zone","group":"visitor"}, {"id":"social","name":"Social Zone","group":"social"}],"links":[{"source":"social", "target":"visitor", "value":1, "type":"near"}]};
        var json3 = {"nodes":[{"id":"office1","name":"Office","group":"working","size":10},{"id":"office2","name":"Office","group":"working","size":10},{"id":"office3","name":"Office","group":"working","size":10},{"id":"office4","name":"Office","group":"working","size":10},{"id":"office5","name":"Office","group":"working","size":10},{"id":"desk1","name":"Desk","group":"working","size":15},{"id":"desk2","name":"Desk","group":"working","size":15},{"id":"desk3","name":"Desk","group":"working","size":15},{"id":"meet1","name":"Meeting","group":"working","size":20},{"id":"meet2","name":"Meeting","group":"working","size":20},{"id":"meet3","name":"Meeting","group":"working","size":20},{"id":"meet4","name":"Meeting","group":"working","size":20},{"id":"working","name":"Working Zone","group":"working"}, {"id":"visitor","name":"Visitor Zone","group":"visitor"}, {"id":"social","name":"Social Zone","group":"social"}],"links":[{"source":"social", "target":"visitor", "value":1, "type":"near"},{"source":"office1", "target":"working", "value":1, "type":"in_zone"},{"source":"office2", "target":"working", "value":1, "type":"in_zone"},{"source":"office3", "target":"working", "value":1, "type":"in_zone"},{"source":"office4", "target":"working", "value":1, "type":"in_zone"},{"source":"office5", "target":"working", "value":1, "type":"in_zone"}, {"source":"meet1", "target":"working", "value":1, "type":"in_zone"},{"source":"meet2", "target":"working", "value":1, "type":"in_zone"},{"source":"meet3", "target":"working", "value":1, "type":"in_zone"},{"source":"meet4", "target":"working", "value":1, "type":"in_zone"},{"source":"desk1", "target":"working", "value":1, "type":"in_zone"},{"source":"desk2", "target":"working", "value":1, "type":"in_zone"},{"source":"desk3", "target":"working", "value":1, "type":"in_zone"}]};
        var json4 = {"nodes":[{"id":"window1","name":"Window","group":"na","size":2}, {"id":"window2","name":"Window","group":"na","size":2}, {"id":"window3","name":"Window","group":"na","size":2}, {"id":"window4","name":"Window","group":"na","size":2}, {"id":"window5","name":"Window","group":"na","size":2}, {"id":"office1","name":"Office","group":"working","size":10},{"id":"office2","name":"Office","group":"working","size":10},{"id":"office3","name":"Office","group":"working","size":10},{"id":"office4","name":"Office","group":"working","size":10},{"id":"office5","name":"Office","group":"working","size":10},{"id":"desk1","name":"Desk","group":"working","size":15},{"id":"desk2","name":"Desk","group":"working","size":15},{"id":"desk3","name":"Desk","group":"working","size":15},{"id":"meet1","name":"Meeting","group":"working","size":20},{"id":"meet2","name":"Meeting","group":"working","size":20},{"id":"meet3","name":"Meeting","group":"working","size":20},{"id":"meet4","name":"Meeting","group":"working","size":20},{"id":"working","name":"Working Zone","group":"working"}, {"id":"visitor","name":"Visitor Zone","group":"visitor"}, {"id":"social","name":"Social Zone","group":"social"}],"links":[{"source":"social", "target":"visitor", "value":1, "type":"near"},{"source":"office1", "target":"working", "value":1, "type":"in_zone"},{"source":"office2", "target":"working", "value":1, "type":"in_zone"},{"source":"office3", "target":"working", "value":1, "type":"in_zone"},{"source":"office4", "target":"working", "value":1, "type":"in_zone"},{"source":"office5", "target":"working", "value":1, "type":"in_zone"}, {"source":"meet1", "target":"working", "value":1, "type":"in_zone"},{"source":"meet2", "target":"working", "value":1, "type":"in_zone"},{"source":"meet3", "target":"working", "value":1, "type":"in_zone"},{"source":"meet4", "target":"working", "value":1, "type":"in_zone"},{"source":"desk1", "target":"working", "value":1, "type":"in_zone"},{"source":"desk2", "target":"working", "value":1, "type":"in_zone"},{"source":"desk3", "target":"working", "value":1, "type":"in_zone"},{"source":"office1", "target":"window1", "value":1, "type":"nearWin"},{"source":"office2", "target":"window2", "value":1, "type":"nearWin"},{"source":"office3", "target":"window3", "value":1, "type":"nearWin"},{"source":"office4", "target":"window4", "value":1, "type":"nearWin"},{"source":"office5", "target":"window5", "value":1, "type":"nearWin"}]};
        var json5 = {"nodes":[{"id":"window1","name":"Window","group":"na","size":2}, {"id":"window2","name":"Window","group":"na","size":2}, {"id":"window3","name":"Window","group":"na","size":2}, {"id":"window4","name":"Window","group":"na","size":2}, {"id":"window5","name":"Window","group":"na","size":2}, {"id":"office1","name":"Office","group":"working","size":10},{"id":"office2","name":"Office","group":"working","size":10},{"id":"office3","name":"Office","group":"working","size":10},{"id":"office4","name":"Office","group":"working","size":10},{"id":"office5","name":"Office","group":"working","size":10},{"id":"desk1","name":"Desk","group":"working","size":15},{"id":"desk2","name":"Desk","group":"working","size":15},{"id":"desk3","name":"Desk","group":"working","size":15},{"id":"meet1","name":"Meeting","group":"working","size":20},{"id":"meet2","name":"Meeting","group":"working","size":20},{"id":"meet3","name":"Meeting","group":"working","size":20},{"id":"meet4","name":"Meeting","group":"working","size":20},{"id":"working","name":"Working Zone","group":"working"}, {"id":"visitor","name":"Visitor Zone","group":"visitor"}, {"id":"social","name":"Social Zone","group":"social"}],"links":[{"source":"social", "target":"visitor", "value":1, "type":"near"},{"source":"office1", "target":"working", "value":1, "type":"in_zone"},{"source":"office2", "target":"working", "value":1, "type":"in_zone"},{"source":"office3", "target":"working", "value":1, "type":"in_zone"},{"source":"office4", "target":"working", "value":1, "type":"in_zone"},{"source":"office5", "target":"working", "value":1, "type":"in_zone"}, {"source":"meet1", "target":"working", "value":1, "type":"in_zone"},{"source":"meet2", "target":"working", "value":1, "type":"in_zone"},{"source":"meet3", "target":"working", "value":1, "type":"in_zone"},{"source":"meet4", "target":"working", "value":1, "type":"in_zone"},{"source":"desk1", "target":"working", "value":1, "type":"in_zone_center"},{"source":"desk2", "target":"working", "value":1, "type":"in_zone_center"},{"source":"desk3", "target":"working", "value":1, "type":"in_zone_center"},{"source":"office1", "target":"window1", "value":1, "type":"nearWin"},{"source":"office2", "target":"window2", "value":1, "type":"nearWin"},{"source":"office3", "target":"window3", "value":1, "type":"nearWin"},{"source":"office4", "target":"window4", "value":1, "type":"nearWin"},{"source":"office5", "target":"window5", "value":1, "type":"nearWin"}]};

    }

    function handleSlashR(line) {
        line = line.trim();
        if (line.startsWith('{'))
            handleParsedCommand(JSON.parse(line));
        else
            handleParsedCommand({ code: line.split(' '), entities: {} });
    }

    function handleCommand(text) {
        if (text.startsWith('\\r')) {
            handleSlashR(text.substring(3));
            return;
        }
        if (text.startsWith('\\t')) {
            handleThingTalk(text.substring(3));
            return;
        }

        updateSpinner(true);
        console.log("handleCommand ",text);
        ws.send(JSON.stringify({ type: 'command', text: text }));
    }

    function handleParsedCommand(json, title) {
        updateSpinner(true);
        ws.send(JSON.stringify({ type: 'parsed', json: json, title: title }));
    }

    function handleThingTalk(tt) {
        updateSpinner(true);
        ws.send(JSON.stringify({ type: 'tt', code: tt }));
    }

    function handleChoice(idx, title) {
        handleParsedCommand({ code: ['bookkeeping', 'choice', String(idx)], entities: {} }, title);
    }

    function handleSpecial(special, title) {
        handleParsedCommand({ code: ['bookkeeping', 'special', 'special:' + special], entities: {} }, title);
    }

    function appendUserMessage(text) {
        container.append($('<span>').addClass('message message-text from-user')
            .text(text));

        manageLostConnectionMsg('add');
        manageSpinner('show');
        scrollChat();
    }

    $('#input-form').submit((event) => {
        var text = $('#input').val();
        if (currCommand !== "")
            pastCommandsUp.push(currCommand);
        if (pastCommandsDown.length !== 0) {
            pastCommandsUp = pastCommandsUp.concat(pastCommandsDown);
            pastCommandsDown = [];
        }
        pastCommandsUp.push(text);

        $('#input').val('');

        handleCommand(text);
        event.preventDefault();
    });

    $('#cancel').click(() => {
        handleSpecial('nevermind', "Cancel.");
    });

    $('#record-button').click(() => {
        $('#chat').empty();
        init(load_data(json0));
    });

    $('#input-form').on('keydown', (event) => { // button is pressed
        if (event.keyCode === 38) { // Up
            // removes last item from array pastCommandsUp, displays it as currCommand, adds current input text to pastCommandsDown
            currCommand = pastCommandsUp.pop();
            if ($('#input').val() !== "")
                pastCommandsDown.push($('#input').val());
            $('#input').val(currCommand);
        }

        if (event.keyCode === 40) { // Down
            // removes last item from array pastCommandsDown, displays it as currCommand, adds current input text to pastCommandsUp
            currCommand = pastCommandsDown.pop();
            if ($('#input').val() !== "")
                pastCommandsUp.push($('#input').val());
            $('#input').val(currCommand);
        }
    });

    $('#save-log').click(() => {
        $.get(baseUrl + '/recording/log/' + conversationId + '.txt').then((res) => {
            $('#recording-log').text(res);
            const email = 'oval-bug-reports@lists.stanford.edu';
            const subject = 'Genie Conversation Log';
            const body = encodeURIComponent(res);
            $('#recording-share').prop('href', `mailto:${email}?subject=${subject}&body=${body}`);
            $('#recording-save').modal('toggle');
        });
    });

    $('#recording-download').click(() => {
        window.open(baseUrl + '/recording/log/' + conversationId + '.txt', "Genie Conversation Log");
    });

    $('#recording-save-done').click(() => {
        $('#recording-save').modal('toggle');
    });

    $('#comment-popup').submit((event) => {
        event.preventDefault();
        $.post(baseUrl + '/recording/comment', {
            id: conversationId,
            comment: $('#comment-block').val(),
            _csrf: document.body.dataset.csrfToken
        }).then((res) => {
            if (res.status === 'ok') {
                $('#commentLast').attr('class', 'fa fa-comment-alt');
                $('#comment-popup').modal('toggle');
            }
        });
    });

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
                    var color;
                    if(d.name == "Window"){
                        color = "#F4B400";
                    }
                    color = fill(d.name);
                    return color;
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
});
