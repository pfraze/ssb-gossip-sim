var graphmitter = require('graphmitter')

// n, n^2 - 100 nodes, 200 edges is 2% the edges needed for full direct connectivity
var N = 100
var E = 200
var graph
var numInbounds = {} // number of inbound links for each node

// helpers
// =======

var simnum = 1
var nodesArray = []
for (var i=0; i < N; i++)
  nodesArray.push('#'+i)

function fullyDispersed () {
  for (var i=0; i < N; i++) {
    if (!graph.node('#'+i)['hasDatum'+simnum])
      return false
  }
  return true
}

function randomNode () {
  return '#' + Math.floor(Math.random() * N)
}

function randomFromEdges (node) {
  var edgeKeys = Object.keys(node.edges)
  return edgeKeys[Math.floor(Math.random() * edgeKeys.length)]
}

function randomWeightedByFailures (node) {
  node.failures = node.failures || {}
  
  // create a set of options
  var options = nodesArray.filter(function (peer) {
    var failures = node.failures[peer] || 0
    var lim = (1/(1+failures)) || 1 // decrease odds of selection due to failures
    return (Math.random() < lim)
  })

  // pick from our options
  var peer = options[Math.floor(Math.random() * options.length)]
  
  // will this fail? track the failure
  if (!node.edges[peer])
    node.failures[peer] = (node.failures[peer]||0) + 1

  return peer
}

function randomWeightedByPopularityAndFailures (node) {
  node.failures = node.failures || {}
  
  // create a set of options
  var options = nodesArray.filter(function (peer) {
    var popularity = Math.min(numInbounds[peer] || 0, 10)
    var failures = node.failures[peer] || 0
    var lim = (popularity+10)/((failures+1)*20) // decrease odds of selection due to failures
    return (Math.random() < lim)
  })

  // pick from our options
  var peer = options[Math.floor(Math.random() * options.length)]
  
  // will this fail? track the failure
  if (!node.edges[peer])
    node.failures[peer] = (node.failures[peer]||0) + 1

  return peer  
}

function runSimulation (pickPeer) {
  // give node 0 the datum
  graph.node('#0')['hasDatum'+simnum] = true

  // simulate random gossip
  var iterations = 0
  while (!fullyDispersed()) {

    // run gossip at each node
    for (var i=0; i < N; i++) {
      var node = graph.node('#'+i)
      if (!node['hasDatum'+simnum])
        continue // dont bother, this node doesnt have the datum yet

      // pick the target peer
      var peer = pickPeer(node)

      // attempting connection...
      if (node.edges[peer]) {
        // connection established! gossip the datum
        graph.node(peer)['hasDatum'+simnum] = true
      }
    }

    iterations++
  }

  simnum++
  return iterations
}

// simulation
// ==========

// find a random graph with full transitive connectivity
var reachable
do { graph = graphmitter.random(N, E) }
while (Object.keys(reachable = graph.traverse({ start: '#0', hops: 10 })).length !== 100)

// count the inbounds
graph.each(function (k, node) {
  for (var e in node.edges) {
    numInbounds[e] = (numInbounds[e]||0) + 1
  }
})

// output graph description
var str = '', lastN = 0, reachableNum = 0
for (var k in reachable) {
  if (lastN < reachable[k]) {
    if (reachableNum)
      str += '\n'+reachable[k]+' hops: ' + reachableNum
    lastN = reachable[k]
    reachableNum = 0
  }
  reachableNum++
}
if (reachableNum)
  str += '\n'+(lastN+1)+' hops: ' + reachableNum
console.log('Graph generated, connectivity from node #0...', str)

// run simulations
console.log('\nSIM RESULTS')
console.log('A datum was gossiped across the network, starting from node #0, using...')
console.log('Random selection from all nodes:', runSimulation(randomNode), 'rounds')
console.log('Random selection from nodes\' edges:', runSimulation(randomFromEdges), 'rounds')
console.log('Random selection from all nodes, weighted by past failures:', runSimulation(randomWeightedByFailures), 'rounds')
console.log('Random selection from all nodes, weighted by popularity and past failures:', runSimulation(randomWeightedByPopularityAndFailures), 'rounds')