'use strict';(function(){CKEDITOR.plugins.add('lineutils');CKEDITOR.LINEUTILS_BEFORE=1;CKEDITOR.LINEUTILS_AFTER=2;CKEDITOR.LINEUTILS_INSIDE=4;function Finder(editor,def){CKEDITOR.tools.extend(this,{editor:editor,editable:editor.editable(),doc:editor.document,win:editor.window},def,true);this.inline=this.editable.isInline();if(!this.inline){this.frame=this.win.getFrame();}
this.target=this[this.inline?'editable':'doc'];}
Finder.prototype={start:function(callback){var that=this,editor=this.editor,doc=this.doc,el,elfp,x,y;var moveBuffer=CKEDITOR.tools.eventsBuffer(50,function(){if(editor.readOnly||editor.mode!='wysiwyg')
return;that.relations={};if(!(elfp=doc.$.elementFromPoint(x,y))||!elfp.nodeType){return;}
el=new CKEDITOR.dom.element(elfp);that.traverseSearch(el);if(!isNaN(x+y)){that.pixelSearch(el,x,y);}
callback&&callback(that.relations,x,y);});this.listener=this.editable.attachListener(this.target,'mousemove',function(evt){x=evt.data.$.clientX;y=evt.data.$.clientY;moveBuffer.input();});this.editable.attachListener(this.inline?this.editable:this.frame,'mouseout',function(){moveBuffer.reset();});},stop:function(){if(this.listener){this.listener.removeListener();}},getRange:(function(){var where={};where[CKEDITOR.LINEUTILS_BEFORE]=CKEDITOR.POSITION_BEFORE_START;where[CKEDITOR.LINEUTILS_AFTER]=CKEDITOR.POSITION_AFTER_END;where[CKEDITOR.LINEUTILS_INSIDE]=CKEDITOR.POSITION_AFTER_START;return function(location){var range=this.editor.createRange();range.moveToPosition(this.relations[location.uid].element,where[location.type]);return range;};})(),store:(function(){function merge(el,type,relations){var uid=el.getUniqueId();if(uid in relations){relations[uid].type|=type;}else{relations[uid]={element:el,type:type};}}
return function(el,type){var alt;if(is(type,CKEDITOR.LINEUTILS_AFTER)&&isStatic(alt=el.getNext())&&alt.isVisible()){merge(alt,CKEDITOR.LINEUTILS_BEFORE,this.relations);type^=CKEDITOR.LINEUTILS_AFTER;}
if(is(type,CKEDITOR.LINEUTILS_INSIDE)&&isStatic(alt=el.getFirst())&&alt.isVisible()){merge(alt,CKEDITOR.LINEUTILS_BEFORE,this.relations);type^=CKEDITOR.LINEUTILS_INSIDE;}
merge(el,type,this.relations);};})(),traverseSearch:function(el){var l,type,uid;do{uid=el.$['data-cke-expando'];if(uid&&uid in this.relations){continue;}
if(el.equals(this.editable)){return;}
if(isStatic(el)){for(l in this.lookups){if((type=this.lookups[l](el))){this.store(el,type);}}}}while(!isLimit(el)&&(el=el.getParent()));},pixelSearch:(function(){var contains=CKEDITOR.env.ie||CKEDITOR.env.webkit?function(el,found){return el.contains(found);}:function(el,found){return!!(el.compareDocumentPosition(found)&16);};function iterate(el,xStart,yStart,step,condition){var y=yStart,tryouts=0,found;while(condition(y)){y+=step;if(++tryouts==25){return;}
found=this.doc.$.elementFromPoint(xStart,y);if(!found){continue;}
else if(found==el){tryouts=0;continue;}
else if(!contains(el,found)){continue;}
tryouts=0;if(isStatic((found=new CKEDITOR.dom.element(found)))){return found;}}}
return function(el,x,y){var paneHeight=this.win.getViewPaneSize().height,neg=iterate.call(this,el.$,x,y,-1,function(y){return y>0;}),pos=iterate.call(this,el.$,x,y,1,function(y){return y<paneHeight;});if(neg){this.traverseSearch(neg);while(!neg.getParent().equals(el)){neg=neg.getParent();}}
if(pos){this.traverseSearch(pos);while(!pos.getParent().equals(el)){pos=pos.getParent();}}
while(neg||pos){if(neg){neg=neg.getNext(isStatic);}
if(!neg||neg.equals(pos)){break;}
this.traverseSearch(neg);if(pos){pos=pos.getPrevious(isStatic);}
if(!pos||pos.equals(neg)){break;}
this.traverseSearch(pos);}};})(),greedySearch:function(){this.relations={};var all=this.editable.getElementsByTag('*'),i=0,el,type,l;while((el=all.getItem(i++))){if(el.equals(this.editable)){continue;}
if(el.type!=CKEDITOR.NODE_ELEMENT){continue;}
if(!el.hasAttribute('contenteditable')&&el.isReadOnly()){continue;}
if(isStatic(el)&&el.isVisible()){for(l in this.lookups){if((type=this.lookups[l](el))){this.store(el,type);}}}}
return this.relations;}};function Locator(editor,def){CKEDITOR.tools.extend(this,def,{editor:editor},true);}
Locator.prototype={locate:(function(){function locateSibling(rel,type){var sib=rel.element[type===CKEDITOR.LINEUTILS_BEFORE?'getPrevious':'getNext']();if(sib&&isStatic(sib)){rel.siblingRect=sib.getClientRect();if(type==CKEDITOR.LINEUTILS_BEFORE){return(rel.siblingRect.bottom+rel.elementRect.top)/2;}else{return(rel.elementRect.bottom+rel.siblingRect.top)/2;}}
else{if(type==CKEDITOR.LINEUTILS_BEFORE){return rel.elementRect.top;}else{return rel.elementRect.bottom;}}}
return function(relations){var rel;this.locations={};for(var uid in relations){rel=relations[uid];rel.elementRect=rel.element.getClientRect();if(is(rel.type,CKEDITOR.LINEUTILS_BEFORE)){this.store(uid,CKEDITOR.LINEUTILS_BEFORE,locateSibling(rel,CKEDITOR.LINEUTILS_BEFORE));}
if(is(rel.type,CKEDITOR.LINEUTILS_AFTER)){this.store(uid,CKEDITOR.LINEUTILS_AFTER,locateSibling(rel,CKEDITOR.LINEUTILS_AFTER));}
if(is(rel.type,CKEDITOR.LINEUTILS_INSIDE)){this.store(uid,CKEDITOR.LINEUTILS_INSIDE,(rel.elementRect.top+rel.elementRect.bottom)/2);}}
return this.locations;};})(),sort:(function(){var locations,sorted,dist,i;function distance(y,uid,type){return Math.abs(y-locations[uid][type]);}
return function(y,howMany){locations=this.locations;sorted=[];for(var uid in locations){for(var type in locations[uid]){dist=distance(y,uid,type);if(!sorted.length){sorted.push({uid:+uid,type:type,dist:dist});}else{for(i=0;i<sorted.length;i++){if(dist<sorted[i].dist){sorted.splice(i,0,{uid:+uid,type:type,dist:dist});break;}}
if(i==sorted.length){sorted.push({uid:+uid,type:type,dist:dist});}}}}
if(typeof howMany!='undefined'){return sorted.slice(0,howMany);}else{return sorted;}};})(),store:function(uid,type,y){if(!this.locations[uid]){this.locations[uid]={};}
this.locations[uid][type]=y;}};var tipCss={display:'block',width:'0px',height:'0px','border-color':'transparent','border-style':'solid',position:'absolute',top:'-6px'},lineStyle={height:'0px','border-top':'1px dashed red',position:'absolute','z-index':9999},lineTpl='<div data-cke-lineutils-line="1" class="cke_reset_all" style="{lineStyle}">'+
'<span style="{tipLeftStyle}">&nbsp;</span>'+
'<span style="{tipRightStyle}">&nbsp;</span>'+
'</div>';function Liner(editor,def){var editable=editor.editable();CKEDITOR.tools.extend(this,{editor:editor,editable:editable,inline:editable.isInline(),doc:editor.document,win:editor.window,container:CKEDITOR.document.getBody(),winTop:CKEDITOR.document.getWindow()},def,true);this.hidden={};this.visible={};if(!this.inline){this.frame=this.win.getFrame();}
this.queryViewport();var queryViewport=CKEDITOR.tools.bind(this.queryViewport,this),hideVisible=CKEDITOR.tools.bind(this.hideVisible,this),removeAll=CKEDITOR.tools.bind(this.removeAll,this);editable.attachListener(this.winTop,'resize',queryViewport);editable.attachListener(this.winTop,'scroll',queryViewport);editable.attachListener(this.winTop,'resize',hideVisible);editable.attachListener(this.win,'scroll',hideVisible);editable.attachListener(this.inline?editable:this.frame,'mouseout',function(evt){var x=evt.data.$.clientX,y=evt.data.$.clientY;this.queryViewport();if(x<=this.rect.left||x>=this.rect.right||y<=this.rect.top||y>=this.rect.bottom){this.hideVisible();}
if(x<=0||x>=this.winTopPane.width||y<=0||y>=this.winTopPane.height){this.hideVisible();}},this);editable.attachListener(editor,'resize',queryViewport);editable.attachListener(editor,'mode',removeAll);editor.on('destroy',removeAll);this.lineTpl=new CKEDITOR.template(lineTpl).output({lineStyle:CKEDITOR.tools.writeCssText(CKEDITOR.tools.extend({},lineStyle,this.lineStyle,true)),tipLeftStyle:CKEDITOR.tools.writeCssText(CKEDITOR.tools.extend({},tipCss,{left:'0px','border-left-color':'red','border-width':'6px 0 6px 6px'},this.tipCss,this.tipLeftStyle,true)),tipRightStyle:CKEDITOR.tools.writeCssText(CKEDITOR.tools.extend({},tipCss,{right:'0px','border-right-color':'red','border-width':'6px 6px 6px 0'},this.tipCss,this.tipRightStyle,true))});}
Liner.prototype={removeAll:function(){var l;for(l in this.hidden){this.hidden[l].remove();delete this.hidden[l];}
for(l in this.visible){this.visible[l].remove();delete this.visible[l];}},hideLine:function(line){var uid=line.getUniqueId();line.hide();this.hidden[uid]=line;delete this.visible[uid];},showLine:function(line){var uid=line.getUniqueId();line.show();this.visible[uid]=line;delete this.hidden[uid];},hideVisible:function(){for(var l in this.visible){this.hideLine(this.visible[l]);}},placeLine:function(location,callback){var styles,line,l;if(!(styles=this.getStyle(location.uid,location.type))){return;}
for(l in this.visible){if(this.visible[l].getCustomData('hash')!==this.hash){line=this.visible[l];break;}}
if(!line){for(l in this.hidden){if(this.hidden[l].getCustomData('hash')!==this.hash){this.showLine((line=this.hidden[l]));break;}}}
if(!line){this.showLine((line=this.addLine()));}
line.setCustomData('hash',this.hash);this.visible[line.getUniqueId()]=line;line.setStyles(styles);callback&&callback(line);},getStyle:function(uid,type){var rel=this.relations[uid],loc=this.locations[uid][type],styles={},hdiff;if(rel.siblingRect){styles.width=Math.max(rel.siblingRect.width,rel.elementRect.width);}
else{styles.width=rel.elementRect.width;}
if(this.inline){styles.top=loc+this.winTopScroll.y-this.rect.relativeY;}else{styles.top=this.rect.top+this.winTopScroll.y+loc;}
if(styles.top-this.winTopScroll.y<this.rect.top||styles.top-this.winTopScroll.y>this.rect.bottom){return false;}
if(this.inline){styles.left=rel.elementRect.left-this.rect.relativeX;}else{if(rel.elementRect.left>0)
styles.left=this.rect.left+rel.elementRect.left;else{styles.width+=rel.elementRect.left;styles.left=this.rect.left;}
if((hdiff=styles.left+styles.width-(this.rect.left+this.winPane.width))>0){styles.width-=hdiff;}}
styles.left+=this.winTopScroll.x;for(var style in styles){styles[style]=CKEDITOR.tools.cssLength(styles[style]);}
return styles;},addLine:function(){var line=CKEDITOR.dom.element.createFromHtml(this.lineTpl);line.appendTo(this.container);return line;},prepare:function(relations,locations){this.relations=relations;this.locations=locations;this.hash=Math.random();},cleanup:function(){var line;for(var l in this.visible){line=this.visible[l];if(line.getCustomData('hash')!==this.hash){this.hideLine(line);}}},queryViewport:function(){this.winPane=this.win.getViewPaneSize();this.winTopScroll=this.winTop.getScrollPosition();this.winTopPane=this.winTop.getViewPaneSize();this.rect=this.getClientRect(this.inline?this.editable:this.frame);},getClientRect:function(el){var rect=el.getClientRect(),relativeContainerDocPosition=this.container.getDocumentPosition(),relativeContainerComputedPosition=this.container.getComputedStyle('position');rect.relativeX=rect.relativeY=0;if(relativeContainerComputedPosition!='static'){rect.relativeY=relativeContainerDocPosition.y;rect.relativeX=relativeContainerDocPosition.x;rect.top-=rect.relativeY;rect.bottom-=rect.relativeY;rect.left-=rect.relativeX;rect.right-=rect.relativeX;}
return rect;}};function is(type,flag){return type&flag;}
var floats={left:1,right:1,center:1},positions={absolute:1,fixed:1};function isElement(node){return node&&node.type==CKEDITOR.NODE_ELEMENT;}
function isFloated(el){return!!(floats[el.getComputedStyle('float')]||floats[el.getAttribute('align')]);}
function isPositioned(el){return!!positions[el.getComputedStyle('position')];}
function isLimit(node){return isElement(node)&&node.getAttribute('contenteditable')=='true';}
function isStatic(node){return isElement(node)&&!isFloated(node)&&!isPositioned(node);}
CKEDITOR.plugins.lineutils={finder:Finder,locator:Locator,liner:Liner};})();