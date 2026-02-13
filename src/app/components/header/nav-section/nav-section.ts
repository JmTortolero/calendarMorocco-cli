import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-nav-section',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav-section.html',
  styleUrls: ['./nav-section.css']
})
export class NavSection {}
