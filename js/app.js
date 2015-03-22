!function() {
  'use strict';

  /**
   * @class DopplerTree
   */
  class DopplerTree {

    constructor(data) {
      /**
       * Tree state
       */
      this.state = DopplerTree.STATES.INIT;

      /**
       * Snap object for the whole tree
       * @type {SnapObject}
       */
      this.tree = Snap('.j-tree');

      /**
       * All leaves
       * @type {Object[]}
       */
      this.leaves = [];


      this.init();
      this.listen();
    }

    /**
     * Initialize essential data
     * @method init
     */
    init() {
      let that = this;

      // load tree svg
      Snap.load('/assets/tree.svg', function(f) {
        that.tree.append(f);
      });

      // fetch tree data
      fetch('/assets/tree.json').then(function(response) {
        return response.json();
      }).then(function(treeData) {
        that.leaves = treeData.map(function(leafData) {
          leafData.snapEl = Snap.select(leafData.id);
          return leafData;
        });

        // all init steps completed 
        that.state = DopplerTree.STATES.STOP;
      });
    }

    /**
     * Listen for bandwidth change
     * @method listen
     */
    listen() {
      let that = this,
        currentDeltas = [],
        maximumReceiveGap = 10,
        receiveHandler = null;

      doppler.init(function(bandwidth) {
        var delta = bandwidth.left - bandwidth.right;

        // Filter small deltas
        if (Math.abs(delta) <= 13) return;

        // Add delta
        currentDeltas.push(delta);

        clearTimeout(receiveHandler);
        receiveHandler = setTimeout(function() {
          that.takeAction(currentDeltas);
          currentDeltas = [];
          clearTimeout(receiveHandler);
        }, 15);
      });
    }

    takeAction(deltas) {
      let minimumDeltasCount = 6;
      if (deltas.length < minimumDeltasCount) return;
      // count of positive deltas
      let countPst = deltas.filter(function(i) {
        return i>0;
      }).length;
      let countNeg = deltas.length - countPst;
      if (countNeg > countPst) {
        this.swingLeft();
      }
      else {
        this.swingRight();
      }
    }

    swingLeft() {
      if (this.state !== DopplerTree.STATES.STOP) return;
      console.log('swing left');
      this.state = DopplerTree.STATES.LEFT;

      let that = this;
      Promise.all(this.leaves.map(this.animLeafLeft.bind(this))).then(function() {
        that.state = DopplerTree.STATES.STOP;
      });
    }

    swingRight() {
      if (this.state !== DopplerTree.STATES.STOP) return;
      console.log('swing right');
      this.state = DopplerTree.STATES.RIGHT;
      
      let that = this;
      var allAnimations = this.leaves.map(this.animLeafRight.bind(this));
      Promise.all(allAnimations).then(function() {
        that.state = DopplerTree.STATES.STOP;
      });   
    }

    animLeafLeft(leaf) {
      let originMtx = leaf.snapEl.transform().globalMatrix.clone();

      let rotatedMtx = leaf.snapEl.transform().globalMatrix;
      rotatedMtx.rotate.apply(rotatedMtx, leaf.leftRotateParams);

      return this.animLeaf(leaf, originMtx, rotatedMtx);
    }

    animLeafRight(leaf) {
      let originMtx = leaf.snapEl.transform().globalMatrix.clone();

      let rotatedMtx = leaf.snapEl.transform().globalMatrix;
      rotatedMtx.rotate.apply(rotatedMtx, leaf.rightRotateParams);

      return this.animLeaf(leaf, originMtx, rotatedMtx);
    }

    animLeaf(leaf, originMtx, rotatedMtx) {
      return new Promise(function(resolve, reject) {
        leaf.snapEl.animate({
          transform: rotatedMtx
        }, 500, mina.linear, function() {
          leaf.snapEl.animate({
            transform: originMtx
          }, 500, mina.linear, resolve);
        })
      });
    }
  }

  DopplerTree.STATES = {
    INIT: Symbol(),
    STOP: Symbol(),
    LEFT: Symbol(),
    RIGHT: Symbol()
  }

  new DopplerTree();


}();