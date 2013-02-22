//================================================================
// jQuery Booklet plugin
//
// Animates img elements to simulate turning pages in a book.
//
// Copyright (c) 2013 Bryan Scheurman
//
// Dual licensed under the MIT and GPL licenses:
// http://www.opensource.org/licenses/mit-license.php
// http://www.gnu.org/licenses/gpl.html
//
//================================================================

(function($) {

    var defaults = {
        container: ".booklet",
        panels: {
            left: ".booklet-pane-left",
            right: ".booklet-pane-right"
        },
        controls: {
            container: ".booklet-controls",
            next: ".booklet-next",
            prev: ".booklet-prev",
            close: ".booklet-close"
        },
        page: {
            width: 290,
            height: 304
        },
        speed: 720,
        disabledButtonClass: "disabled"
    };

    $.fn.booklet = function(options) {
        
        // create and return booklet objects for all matched elements
        return $(this).each(function() {
        
            var booklet = this;
            
            //================================================================
            // initialization
            //================================================================        
            
            booklet.settings = merge(options);
            booklet.current = 0;
            
            // set the initial properties/css and next/prev events on the img element "pages"
            booklet.pages = processBookletPages.apply(booklet);
            
            //================================================================
            // Event handlers
            //================================================================
            
            var controls = booklet.settings.controls;
            
            // add data to the button elements
            $(controls.next, controls.container).data("method", "next");
            $(controls.prev, controls.container).data("method", "prev");
            
            // next/previous buttons handler
            $(controls.container, booklet).delegate(controls.next + "," + controls.prev, "click", function(e) {
                
                e.preventDefault();
                
                var button = $(e.currentTarget);
                
                if (button.hasClass(booklet.settings.disabledButtonClass)) {
                    return false;
                }
                
                // invoke the page turn function with the current booklet as context,
                // and also the method/direction to animate
                turnPage.apply(booklet, [ button.data("method") ]);
            });
            
            // close button handler, trigger an event so users can specify behavior
            $(booklet).delegate(controls.close, "click", function(e) {
                e.preventDefault();
                $(document).trigger("onBookletClose");
            });
        });
    };
    
    // Creates a settings object based on the defaults and
    // any override options passed in
    function merge(options) {
    
        // start by extending the defaults with user options
        var settings = $.extend(true, {}, defaults, options || {});
        
        // get the page width defined after extending to create some
        // dynamic start/end css values for page animations
        var w = settings.page.width;
        var css = {
            left: {
                start: { width: 0, right: w * -1 },
                end: { width: w, right: w * -1 }
            },
            right: {
                start: { width: w, right: 0 },
                end: { width: 0, right: w }
            }
        };
        
        // add the animation css into the settings object and return
        return $.extend(true, settings, { page: { animCss: css } });
    }
    
    function processBookletPages() {
        
        var booklet = this;
        var settings = booklet.settings;
        var height = settings.page.height;
        var leftPanelClass = settings.panels.left.replace(/^\./, ""); // get rid of the leading . from the selector
        
        // collection of pages to return, an array for each panel
        var pages = {
            left: [],
            right: []
        };
        
        $(settings.panels.left + "," + settings.panels.right, this).each(function() {
            
            // determine which panel the iteration is on
            var panel = $(this).hasClass(leftPanelClass) ? "left" : "right";
            
            // set some vars based on panel
            var css = settings.page.animCss[panel];
            var operator = panel == "left" ? 1 : -1; // used to dynamically (in|de)crement the z-index value
            
            $("img", this).each(function(index, img) {
                
                // set the intial starting css values for the current img...
                var page = $(img).css({
                    position: "absolute",
                    width: css.start.width + "px",
                    height: height + "px",
                    right: css.start.right + "px",
                    "z-index": 5000 + (index * 10 * operator) // "stack" the images by counting down (for right) or up (for left) by 10
                })
                .data("method", (panel == "left") ? "prev" : "next")
                
                // ...and bind the events (next/prev get triggered in the turnPage function)
                .bind("next", function() {
                    $(this).css(css.start).animate(css.end, settings.speed);
                })
                .bind("prev", function() {
                    $(this).css(css.end).animate(css.start, settings.speed);
                })
                .bind("reset", function() {
                    $(this).css(css.start);
                })
                
                // support clicking and dragging to turn pages
                .bind("mousedown", function(e) {
                    e.preventDefault();
                    
                    var x = e.pageX;
                    var page = $(this);
                    var method = page.data("method");
                    
                    page.bind("mouseup", function(e) {
                        
                        var delta = x - e.pageX;
                        
                        if ((delta > 0 && method == "next") || (delta < 0 && method == "prev")) {
                            page.unbind("mouseup");
                            turnPage.apply(booklet, [ method ]);
                        }
                    });
                });
                
                // add the page to the correct array
                pages[panel].push(page);
            });
        });
        
        return pages;
    }
    
    function turnPage(method) {        
        
        // always animate a page from both panels.
        // right to left for "next" page turns, left to right for "prev"
        var pages = [];
        
        if (method == "next") {
            pages.push(this.pages.right[this.current]);
            pages.push(this.pages.left[this.current]);
        }
        else {            
            pages.push(this.pages.left[this.current - 1]);
            pages.push(this.pages.right[this.current - 1]);
        }
        
        // do the animations, trigger the first page immediately (i.e. 0 * speed) and 
        // wait for the first to finish before triggering the second
        for (var i = 0; i < 2; i++) {
            
            var page = pages[i];
            var speed = this.settings.speed;
            
            // use a closure so the args are not undefined
            (function(p, s) {
                setTimeout(function() { p.trigger(method); }, s);
            })(page, i * speed);
        }
        
        // update the current page
        this.current += (method == "next") ? 1 : -1;
        
        // enable/disable the control buttons as needed
        $(this.settings.controls.prev, this).toggleClass(this.settings.disabledButtonClass, this.current == 0);
        $(this.settings.controls.next, this).toggleClass(this.settings.disabledButtonClass, this.current >= this.pages.right.length);
    }

})(jQuery);
