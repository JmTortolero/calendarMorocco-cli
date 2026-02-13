import { Component } from '@angular/core';
import { TitleSection } from './title-section/title-section';
import { NavSection } from './nav-section/nav-section';


@Component({
  selector: 'app-header',
  imports: [TitleSection, NavSection],
  templateUrl: './header.html',
  styleUrls: ['./header.css'],
  standalone: true,
})
export class Header {}
