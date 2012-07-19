/*
 * Copyright 2012 Denis Washington <denisw@online.de>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// test/node_sub.js:
// Tests requests on node subscription lists.

var should = require('should');
var tutil = require('./support/testutil');

// See xmpp_mockserver.js
var mockConfig = {
    users: {
        'alice': 'alice',
        'bob': 'bob',
        'eve': 'eve'
    },
    stanzas: {
        // Get node subscriptions + affiliations
        '<iq from="alice@localhost/http" type="get">\
           <pubsub xmlns="http://jabber.org/protocol/pubsub#owner">\
             <affiliations node="/user/alice@localhost/posts"/>\
           </pubsub>\
         </iq>':
        '<iq type="result">\
           <pubsub xmlns="http://jabber.org/protocol/pubsub#owner">\
             <affiliations node="/user/alice@localhost/posts">\
               <affiliation jid="alice@localhost" affiliation="owner"/>\
               <affiliation jid="bob@localhost" affiliation="subscriber"/>\
             </affiliations>\
           </pubsub>\
         </iq>',

        // Subscribe to a channel
        '<iq from="eve@localhost/http" type="set">\
           <pubsub xmlns="http://jabber.org/protocol/pubsub">\
             <subscribe node="/user/alice@localhost/posts" jid="eve@localhost"/>\
           </pubsub>\
         </iq>':
        {
            '':
            '<iq type="result">\
              <pubsub xmlns="http://jabber.org/protocol/pubsub">\
                <subscription node="/user/alice@localhost/posts" \
                              jid="eve@localhost" \
                              subid="foo" subscription="subscribed"/>\
              </pubsub>\
            </iq>',

            // Get node subscriptions after subscribing
            '<iq from="eve@localhost/http" type="get">\
               <pubsub xmlns="http://jabber.org/protocol/pubsub#owner">\
                 <affiliations node="/user/alice@localhost/posts"/>\
               </pubsub>\
             </iq>':
            '<iq type="result">\
               <pubsub xmlns="http://jabber.org/protocol/pubsub#owner">\
                 <affiliations node="/user/alice@localhost/posts">\
                   <affiliation jid="alice@localhost" affiliation="owner"/>\
                   <affiliation jid="bob@localhost" affiliation="subscriber"/>\
                   <affiliation jid="eve@localhost" affiliation="subscriber"/>\
                 </affiliations>\
               </pubsub>\
             </iq>'
        },

        // Unsubscribe from node
        '<iq from="eve@localhost/http" type="set">\
           <pubsub xmlns="http://jabber.org/protocol/pubsub">\
             <unsubscribe node="/user/alice@localhost/posts" jid="eve@localhost"/>\
           </pubsub>\
         </iq>':
        {
            '':
            '<iq type="result"/>',

            // Get node subscriptions after unsubscribing
            '<iq from="eve@localhost/http" type="get">\
               <pubsub xmlns="http://jabber.org/protocol/pubsub#owner">\
                 <affiliations node="/user/alice@localhost/posts"/>\
               </pubsub>\
             </iq>':
            '<iq type="result">\
               <pubsub xmlns="http://jabber.org/protocol/pubsub#owner">\
                 <affiliations node="/user/alice@localhost/posts">\
                   <affiliation jid="alice@localhost" affiliation="owner"/>\
                   <affiliation jid="bob@localhost" affiliation="subscriber"/>\
                 </affiliations>\
               </pubsub>\
             </iq>'
        }
    }
};

describe('Node Subscription List', function() {

    before(function(done) {
        tutil.startHttpServer(function() {
            tutil.mockXmppServer(mockConfig, done);
        });
    });

    describe('GET', function() {

        it('should return the node\'s subscribers', function(done) {
            var options = {
                path: '/channels/alice@localhost/posts/subscriptions',
                auth: 'alice@localhost/http:alice'
            };
            tutil.get(options, function(res, body) {
                res.statusCode.should.equal(200);
                var subscribers = JSON.parse(body);
                subscribers.should.eql({
                    'alice@localhost': 'owner',
                    'bob@localhost': 'subscriber'
                });
                done();
            }).on('error', done);
        });

    });

    describe('POST', function() {

        it('should allow subscription', function(done) {
            var options = {
                path: '/channels/alice@localhost/posts/subscriptions',
                auth: 'eve@localhost/http:eve',
                body: JSON.stringify([true])
            };
            tutil.post(options, function(res) {
                res.statusCode.should.equal(200);

                var options2 = {
                    path: '/channels/alice@localhost/posts/subscriptions',
                    auth: 'eve@localhost/http:eve'
                };
                tutil.get(options2, function(res, body) {
                    res.statusCode.should.equal(200);
                    JSON.parse(body).should.eql({
                        'alice@localhost': 'owner',
                        'bob@localhost': 'subscriber',
                        'eve@localhost': 'subscriber'
                    });
                    done();
                }).on('error', done);
            }).on('error', done);
        });

        it('should allow unsubscription', function(done) {
            var options = {
                path: '/channels/alice@localhost/posts/subscriptions',
                auth: 'eve@localhost/http:eve',
                body: JSON.stringify([false])
            };
            tutil.post(options, function(res) {
                res.statusCode.should.equal(200);

                var options2 = {
                    path: '/channels/alice@localhost/posts/subscriptions',
                    auth: 'eve@localhost/http:eve'
                };
                tutil.get(options2, function(res, body) {
                    res.statusCode.should.equal(200);
                    JSON.parse(body).should.eql({
                        'alice@localhost': 'owner',
                        'bob@localhost': 'subscriber',
                    });
                    done();
                }).on('error', done);
            }).on('error', done);
        });

    });

    after(function() {
        tutil.end();
    });

});


