---
---
(function(window) {

  /**
   * Date.parse with progressive enhancement for ISO 8601 <https://github.com/csnover/js-iso8601>
   * © 2011 Colin Snover <http://zetafleet.com>
   * Released under MIT license.
   */
  (function (Date, undefined) {
      var origParse = Date.parse, numericKeys = [ 1, 4, 5, 6, 7, 10, 11 ];
      Date.parse = function (date) {
          var timestamp, struct, minutesOffset = 0;

          // ES5 §15.9.4.2 states that the string should attempt to be parsed as a Date Time String Format string
          // before falling back to any implementation-specific date parsing, so that’s what we do, even if native
          // implementations could be faster
          //              1 YYYY                2 MM       3 DD           4 HH    5 mm       6 ss        7 msec        8 Z 9 ±    10 tzHH    11 tzmm
          if ((struct = /^(\d{4}|[+\-]\d{6})(?:-(\d{2})(?:-(\d{2}))?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?(?:(Z)|([+\-])(\d{2})(?::(\d{2}))?)?)?$/.exec(date))) {
              // avoid NaN timestamps caused by “undefined” values being passed to Date.UTC
              for (var i = 0, k; (k = numericKeys[i]); ++i) {
                  struct[k] = +struct[k] || 0;
              }

              // allow undefined days and months
              struct[2] = (+struct[2] || 1) - 1;
              struct[3] = +struct[3] || 1;

              if (struct[8] !== 'Z' && struct[9] !== undefined) {
                  minutesOffset = struct[10] * 60 + struct[11];

                  if (struct[9] === '+') {
                      minutesOffset = 0 - minutesOffset;
                  }
              }

              timestamp = Date.UTC(struct[1], struct[2], struct[3], struct[4], struct[5] + minutesOffset, struct[6], struct[7]);
          }
          else {
              timestamp = origParse ? origParse(date) : NaN;
          }

          return timestamp;
      };
  }(Date));

  // @ Michael Theriot - 2015-9-13
  var getTimestamp = (function() {
    function pad(s, n) {
      return s.toString().length < n ? pad('0' + s, n) : s;
    }
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    function clockStamp(date) {
      var hour = date.getHours();
      var hours = hour % 12 || 12;
      var ampm = hour >= 0 && hour < 12 ? 'am' : 'pm';
      return hours + ':' + pad(date.getMinutes(), 2) + ampm;
    }
    return function(start, end) {
      var startDate = new Date(start);
      var endDate = new Date(end);
      var month = months[startDate.getMonth()];
      return month + ' ' + startDate.getDate() + ', ' + startDate.getFullYear() + ' ' + clockStamp(startDate) + ' - ' + clockStamp(endDate);
    };
  })();

  // @ Michael Theriot - 2015-9-14
  (function(window, gCalId, gCalKey, getTimestamp) {
    var timestamp = (new Date()).toISOString();
    var fetchUrl = 'https://www.googleapis.com/calendar/v3/calendars/' + gCalId + '/events?orderBy=startTime&singleEvents=true&timeMin=' + timestamp + '&key=' + gCalKey;
    var calUrl = 'https://www.google.com/calendar/embed?src=' + gCalId + '&ctz=America/Chicago';

    var Event = function(startTime, endTime, startISO, title, description, location) {
      this.startTime = startTime;
      this.endTime = endTime;
      this.startISO = startISO;
      this.title = title;
      this.description = description;
      this.location = location;
    }

    var calendar = {
      get: function() {
        return new Promise(function(resolve, reject) {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', fetchUrl);
          xhr.onreadystatechange = function(e) {
            if(this.readyState == 4) {
              switch(this.status) {
                case 200:
                  var response = this.responseText;
                  var data;
                  try {
                    data = JSON.parse(response);
                  } catch(e) {
                    reject(new Error('Invalid calendar format'));
                  }
                  resolve(data);
                  break;
                default:
                  reject(new Error('Could not fetch calendar'));
              }
            }
          };
          xhr.send();
        });
      }
    };

    var parseEvents = function(data) {
      return new Promise(function(resolve, reject) {
        var events = [];
        try {
          var startTime, endTime, startISO, title, description, location;
          for(var i = 0; i < data.items.length; i++) {
            cEvent = data.items[i];
            startTime = Date.parse(cEvent.start.dateTime);
            endTime = Date.parse(cEvent.end.dateTime);
            startISO = cEvent.start.dateTime;
            title = cEvent.summary;
            description = cEvent.description || null;
            location = cEvent.location || null;
            events.push(new Event(startTime, endTime, startISO, title, description, location));
          }
        } catch(e) {
          reject(new Error('Invalid calendar format'));
        }
        resolve(events);
      });
    };

    var eEventContainer;

    var listEvents = function(events) {
      return new Promise(function(resolve, reject) {
        if(events.length > 0) {
          var ol = document.createElement('ol');
          for(var i = 0; i < events.length; i++) {
            var li = document.createElement('li');
            var h2 = document.createElement('h2');
            h2.setAttribute('class', 'time-header');
            h2.textContent = events[i].title;
            li.appendChild(h2);
            var time = document.createElement('time');
            time.textContent = getTimestamp(events[i].startTime, events[i].endTime);
            time.setAttribute('datetime', events[i].startISO);
            li.appendChild(time);
            var pgs = events[i].description.split(/\n+/);
            for(var j = 0, p; j < pgs.length; j++) {
              p = document.createElement('p');
              // Facebook link
              if(j === pgs.length - 1 && (/^http:\/\/(www\.)?facebook\.com\/events\/\d+\/$/).test(pgs[j])) {
                var a = document.createElement('a');
                a.setAttribute('href', pgs[j]);
                a.textContent = 'Join event on Facebook';
                p.appendChild(a);
                a = document.createElement('a');
                a.setAttribute('href', pgs[j]);
                a.textContent = h2.textContent;
                h2.textContent = '';
                h2.appendChild(a);
              } else {
                p.textContent = pgs[j];
              }
              li.appendChild(p);
            }
            ol.appendChild(li);
          }
          eEventContainer.removeChild(eEventNotif);
          eEventContainer.appendChild(ol);
        } else {
          eEventNotif.textContent = 'There are no upcoming events at this moment.';
        }
        resolve();
      });
    };

    var eEventNotif;

    var displayError = function(e) {
      eEventNotif.textContent = 'There was an issue retrieving the event list. Please use the full calendar.';
    };

    window.addEventListener('load', function(event) {
      eEventContainer = document.querySelector('#event-list');
      eEventNotif = document.createElement('p');
      eEventNotif.textContent = 'Fetching the event list. Please wait...';
      eEventContainer.appendChild(eEventNotif);
      if(eEventContainer) {
        calendar
          .get()
          .then(parseEvents)
          .then(listEvents)
          .catch(displayError);
      }
    });
  })(window, '{{ site.gCalId }}', '{{ site.gCalKey }}', getTimestamp);

})(window);
