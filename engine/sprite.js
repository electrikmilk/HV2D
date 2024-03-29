/*
 * Canvas objects abstraction
 *
 * Draws shapes and images onto the canvas with optional collision physics.
 */

import {config, ctx, Log} from './init.js';
import {colliding} from './physics.js';
import {color, randInt} from './helpers.js';
import {draw} from './screen.js';

let sprites = [];
let spritesCount = 0;

const debugColors = ['#FF00FF', '#00FFFF', '#00FF0E'];

export class Sprite {
    name;
    visible = true;
    x = 0;
    y = 0;
    width = 1;
    height = 1;
    solid = false;
    shape = 'rectangle';
    radius = 0;
    angle = 0;
    background;

    constructor(options) {
        if (!options) {
            return;
        }

        this.name = options.name ?? `Sprite ${spritesCount + 1}`;
        this.x = (options.x) ? parseInt(options.x) : 0;
        this.y = (options.y) ? parseInt(options.y) : 0;
        this.z = (options.z) ? parseInt(options.z) : null;
        this.width = parseInt(options.width);
        this.height = parseInt(options.height);
        this.solid = (options.solid) ? options.solid : false;
        this.shape = (options.shape) ? options.shape : 'rectangle';
        this.radius = (options.radius) ? options.radius : 0;
        this.angle = options.angle ?? 0;
        this.background = color(options.background);
        this.border = null;
        if (options.border) {
            this.border = {
                color: color('black'),
                width: 1,
            };
            this.border.color = color(options.border.color);
            this.border.width = options.border.width ?? 0;
        }
        this.shadow = null;
        if (options.shadow) {
            this.shadow = {
                color: color('black'),
                blur: 0,
                offsetX: 0,
                offsetY: 0,
            };
            this.shadow.color = color(options.shadowColor);
            this.shadow.blur = options.shadow.blur ?? 0;
            this.shadow.offsetX = options.shadow.offsetX ?? 0;
            this.shadow.offsetY = options.shadow.offsetY ?? 0;
        }
        if (options.image) {
            this.setImage(options.image);
        }
        this.gradient = null;
        if (options.gradient) {
            this.gradient = {
                colors: [],
                ratio: options.gradient.ratio ?? 0,
                angle: options.gradient.angle ?? 0,
            };
            this.gradient.type = options.gradient.type ?? 'linear';
            if (options.gradient.colors) {
                options.gradient.colors.forEach((c) => {
                    this.gradient.colors.push(color(c));
                });
            }
        }
        if (options.center) {
            this.x = (config('width') / 2) - (this.width / 2);
            this.y = (config('height') / 2) - (this.height / 2);
        }
        this.boundToViewport = (options.boundToViewport) ? options.boundToViewport : false;
        this.flashInterval = null;
        this.visible = options.visible ?? true;
        if (this.z === null) {
            sprites.push(this);
        } else {
            sprites[this.z] = this;
        }
    }

    setImage(src, onload) {
        this.image = new Image();
        this.image.src = src;
        this.image.loading = 'eager';
        this.image.onload = () => {
            if (onload) {
                onload();
            }

            if (this.width && this.height) {
                return;
            }
            if (!this.width) {
                this.width = this.image.naturalWidth;
            }
            if (!this.height) {
                this.height = this.image.naturalHeight;
            }

            Log.warn(`The dimensions for sprite '${this.name}' were determined by the size of the image as either no width or height were explicitly set.`);
        };
    }

    setBackground(c) {
        this.background = color(c);
    }

    setGradientColors(colors) {
        this.gradient.colors = [];
        colors.forEach((c) => {
            this.gradient.colors.push(color(c));
        });
    }

    setBorderColor(c) {
        this.borderColor = color(c);
    }

    setBorderWidth(width) {
        this.borderWidth = width;
    }

    setShadowColor(c) {
        this.shadowColor = color(c);
    }

    setShadowBlur(blur) {
        this.shadowBlur = blur;
    }

    setShadowOffsetX(x) {
        this.shadowOffsetX = x;
    }

    setShadowOffsetY(y) {
        this.shadowOffsetY = y;
    }

    flash(seconds = .5, times = 0) {
        if (!this.visible) {
            this.visible = true;
        }
        seconds = seconds * 1000;
        let self = this;
        let flashed = 0;
        this.flashInterval = setInterval(function() {
            self.visible = !self.visible;
            flashed++;
            if (times === 0) {
                return;
            }
            if (flashed > times) {
                self.stopFlashing();
            }
        }, seconds);
    }

    toggle() {
        this.visible = !this.visible;
    }

    show() {
        this.visible = true;
    }

    hide() {
        this.visible = false;
    }

    stopFlashing() {
        if (!this.flashInterval) {
            return;
        }

        clearInterval(this.flashInterval);
    }

    rotate(angle) {
        this.angle = angle;
    }

    move(direction, amount) {
        let new_x = this.x;
        let new_y = this.y;
        let next_x = this.x;
        let next_y = this.y;
        switch (direction) {
            case 'up':
                new_y -= amount;
                next_y -= amount - amount;
                break;
            case 'left':
                new_x -= amount;
                next_x -= amount - amount;
                break;
            case 'right':
                new_x += amount;
                next_x += amount + amount;
                break;
            case 'down':
                new_y += amount;
                next_y += amount + amount;
                break;
        }
        // collision
        let is_colliding = false;
        if (this.solid === true) {
            // describe next position
            let new_position = {
                x: next_x,
                y: next_y,
                width: this.width,
                height: this.height,
                shape: this.shape,
            };
            // check next position against other solid sprites
            sprites.filter(s => s !== this && s.solid).forEach((sprite) => {
                is_colliding = colliding(new_position, sprite);
            });
            // bound to viewport
            if (this.boundToViewport === true) {
                let bound_x = new_x + this.width - amount;
                let bound_y = new_y + this.height - amount;
                if (bound_x >= config('width') || bound_y >= config('height')) {
                    is_colliding = true;
                }
                if (next_x === 0 || next_y === 0) {
                    is_colliding = true;
                }
            }
            if (is_colliding) {
                return;
            }
            // we aren't colliding with anything else solid, allow movement to the next position
        }

        // move to new position
        this.x = new_x;
        this.y = new_y;
    }
}

function debugSprite(sprite) {
    let x = sprite.x + sprite.width + 10;
    let y = sprite.y;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, sprite.y, 145, 135);
    ctx.fillStyle = '#121212';
    ctx.fill();
    ctx.restore();
    x += 10;
    y += 10;

    ctx.save();
    ctx.fillStyle = '#fafafa';
    ctx.font = '14px \'Courier\'';
    ctx.textAlign = 'top';
    ctx.textBaseline = 'top';
    ctx.fillText(`name: ${sprite.name}`, x, y);
    ctx.fillText(`visible: ${sprite.visible}`, x, y + 20);
    ctx.fillText(`x: ${sprite.x}`, x, y + 40);
    ctx.fillText(`y: ${sprite.y}`, x, y + 60);
    ctx.fillText(`width: ${sprite.width}`, x, y + 80);
    ctx.fillText(`height: ${sprite.width}`, x, y + 100);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    if (sprite.angle) {
        ctx.rotate(sprite.angle * Math.PI / 180);
    }
    switch (sprite.shape) {
        case 'circle':
            ctx.arc(sprite.x, sprite.y, sprite.radius, 0, 2 * Math.PI, false);
            break;
        default:
            ctx.rect(sprite.x, sprite.y, sprite.width, sprite.height);
    }
    if (!sprite.hasOwnProperty('debugColor')) {
        sprite.debugColor = color(debugColors[randInt(0, 2)]);
    }
    ctx.lineWidth = 5;
    ctx.strokeStyle = sprite.debugColor;
    ctx.stroke();
    ctx.restore();
}

setTimeout(() => {
    draw(() => {
        ctx.save();
        if (sprites.length !== 0) {
            sprites.sort().reverse();
            sprites.forEach(function(sprite) {
                if (config('debug')) {
                    debugSprite(sprite);
                }

                ctx.save();
                if (!sprite.visible) {
                    return;
                }
                ctx.beginPath();
                if (sprite.angle) {
                    ctx.rotate(sprite.angle * Math.PI / 180);
                }
                if (sprite.image) {
                    ctx.drawImage(sprite.image, sprite.x, sprite.y, sprite.width, sprite.height);
                } else if (sprite.shape === 'rectangle') {
                    ctx.rect(sprite.x, sprite.y, sprite.width, sprite.height);
                } else {
                    ctx.arc(sprite.x, sprite.y, sprite.radius, 0, 2 * Math.PI, false);
                }
                if (sprite.border) {
                    ctx.lineWidth = sprite.border.width ?? 1;
                    ctx.strokeStyle = sprite.border.color;
                    ctx.stroke();
                }
                if (sprite.background) {
                    ctx.fillStyle = sprite.background;
                    ctx.fill();
                }
                if (sprite.gradient) {
                    let gradient;
                    if (sprite.gradient.type === 'linear') {
                        gradient = ctx.createLinearGradient(sprite.x + sprite.gradient.ratio, sprite.gradient.angle, (sprite.x + (sprite.width + sprite.height)) - sprite.gradient.ratio, 0);
                    } else {
                        gradient = ctx.createRadialGradient(75, 50, 5, 90, 60, 100);
                    }
                    if (sprite.gradient.colors) {
                        sprite.gradient.colors.forEach((c, i) => {
                            gradient.addColorStop((i / sprite.gradient.colors.length), c);
                        });
                    }
                    ctx.fillStyle = gradient;
                    if (sprite.shape === 'rectangle') {
                        ctx.fillRect(sprite.x, sprite.y, sprite.width, sprite.height);
                    } else {
                        ctx.arc(sprite.x, sprite.y, sprite.radius, 0, 2 * Math.PI, false);
                    }
                }
                if (sprite.shadow) {
                    ctx.shadowColor = sprite.shadow.color;
                    ctx.shadowBlur = sprite.shadow.blur ?? 0;
                    ctx.shadowOffsetX = sprite.shadow.offsetX ?? 0;
                    ctx.shadowOffsetY = sprite.shadow.offsetY ?? 0;
                }
                ctx.restore();
            });
        }
        ctx.restore();
    });
}, 500);
