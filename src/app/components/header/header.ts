import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TitleSection } from './title-section/title-section';
import { NavSection } from './nav-section/nav-section';


@Component({
  selector: 'app-header',
  imports: [CommonModule, TitleSection, NavSection],
  templateUrl: './header.html',
  styleUrl: './header.css',
  standalone: true,
})
export class Header {}
